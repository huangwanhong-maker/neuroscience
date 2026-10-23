// A network written as JSON, and its results written back.
//
// A specification names its populations (a model, a size, parameters, initial states and
// biases), its projections (a source, a target, a receptor, a rule of connection, a weight, a
// delay, a synapse with its plasticity), its devices and its recorders. Every quantity is
// written with its unit ("20 ms", "0.1 mV", "87.8 pA", "8 kHz") and checked against the
// dimension the model declares for it; a dimensionless quantity may be a bare number. A
// quantity drawn for each synapse or neuron is a distribution:
//   {"uniform": ["0 mV", "20 mV"]}, {"normal": ["0.1 mV", "0.01 mV"], "min": "0 mV"},
//   {"lognormal": ["0.1 mV", 0.5]}  (a median and the sigma of the logarithm).
// The schema, with an example, is in the module's README.

#pragma once

#include <cmath>
#include <memory>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#include "json.hpp"
#include "models.hpp"
#include "network.hpp"

namespace neuroscience::snn {

namespace spec {

inline double quantity(const Json& v, const Dimension& d, std::string_view what) {
  if (v.is_number()) {
    if (!(d == dim::one)) throw std::invalid_argument(std::string(what) + ": a bare number for a quantity of dimension " + pu::symbol(d) + "; write its unit");
    return v.as_number();
  }
  if (v.is_string()) return pu::parse_as(v.as_string(), d, what);
  throw std::invalid_argument(std::string(what) + ": expected a quantity");
}

inline Distribution distribution(const Json& v, const Dimension& d, std::string_view what) {
  if (!v.is_object()) return Distribution::constant(quantity(v, d, what));
  Distribution out;
  auto pair = [&](std::string_view key, Distribution::Kind kind, bool second_dimensionless = false) {
    const Json* a = v.find(key);
    if (!a) return false;
    if (!a->is_array() || a->size() != 2) throw std::invalid_argument(std::string(what) + ": " + std::string(key) + " takes two values");
    out.kind = kind;
    out.a = quantity(a->as_array()[0], d, what);
    out.b = second_dimensionless ? quantity(a->as_array()[1], dim::one, what) : quantity(a->as_array()[1], d, what);
    return true;
  };
  if (pair("uniform", Distribution::Kind::uniform)) {}
  else if (pair("normal", Distribution::Kind::normal)) {}
  else if (pair("lognormal", Distribution::Kind::lognormal, true)) {
    if (!(out.a > 0)) throw std::invalid_argument(std::string(what) + ": a lognormal's median is positive");
    out.a = std::log(out.a);
  } else if (const Json* c = v.find("constant")) {
    out = Distribution::constant(quantity(*c, d, what));
  } else {
    throw std::invalid_argument(std::string(what) + ": a distribution is uniform, normal, lognormal or constant");
  }
  if (const Json* lo = v.find("min")) out.low = quantity(*lo, d, what);
  if (const Json* hi = v.find("max")) out.high = quantity(*hi, d, what);
  return out;
}

inline double number(const Json& o, std::string_view key, double fallback) {
  const Json* v = o.find(key);
  return v ? v->as_number() : fallback;
}

}  // namespace spec

// What a specification makes: the network, and the recorders by kind, in their order.
struct Built {
  std::unique_ptr<Network> network;
  double duration = 0;
  std::vector<SpikeRecorder*> spikes;
  std::vector<StateRecorder*> states;
  std::vector<WeightRecorder*> weights;
  struct Rate { SpikeRecorder* recorder; double bin; };
  std::vector<Rate> rates;
};

inline Built build(const Json& j) {
  using spec::quantity;
  Built out;
  Settings st;
  if (const Json* v = j.find("resolution")) st.resolution = quantity(*v, dim::time, "resolution");
  if (const Json* v = j.find("seed")) st.seed = static_cast<std::uint64_t>(v->as_number());
  if (const Json* v = j.find("threads")) st.threads = static_cast<std::size_t>(std::max(1.0, v->as_number()));
  if (const Json* v = j.find("integrator")) {
    const std::string m = v->as_string();
    if (m == "default") st.stepping.method = pd::Method::exact;
    else if (m == "euler") st.stepping.method = pd::Method::euler;
    else if (m == "heun") st.stepping.method = pd::Method::heun;
    else if (m == "rk4") st.stepping.method = pd::Method::rk4;
    else if (m == "dopri5") st.stepping.method = pd::Method::dopri5;
    else if (m == "rush_larsen") st.stepping.method = pd::Method::rush_larsen;
    else throw std::invalid_argument("integrator: default, euler, heun, rk4, dopri5 or rush_larsen");
  }
  out.duration = j.has("duration") ? quantity(j.at("duration"), dim::time, "duration") : 0;
  out.network = std::make_unique<Network>(st);
  Network& net = *out.network;

  for (const Json& p : j.at("populations").as_array()) {
    const std::string name = p.at("name").as_string();
    const auto size = static_cast<std::size_t>(p.at("size").as_number());
    Population& pop = net.adopt(make_population(p.at("model").as_string(), name, size));
    const ModelInfo& info = pop.info();
    if (const Json* ps = p.find("parameters"))
      for (const auto& [key, value] : ps->as_object()) {
        const auto it = std::find_if(info.parameters.begin(), info.parameters.end(), [&](const auto& q) { return q.name == key; });
        if (it == info.parameters.end()) throw std::invalid_argument(name + ": " + std::string(info.name) + " has no parameter \"" + key + "\"");
        pop.set_parameter(key, quantity(value, it->dimension, name + "." + key));
      }
    // The initial state follows the parameters (a model starts at rest), then what is given.
    for_each_model([&](auto* m) {
      using M = std::remove_pointer_t<decltype(m)>;
      if (auto* q = dynamic_cast<PopulationOf<M>*>(&pop)) q->reinitialise();
    });
    if (const Json* init = p.find("initial"))
      for (const auto& [key, value] : init->as_object()) {
        const std::size_t c = pop.component(key);
        net.initialise(pop, c, spec::distribution(value, info.components[c].dimension, name + ".initial." + key));
      }
    if (const Json* b = p.find("bias")) {
      std::vector<double> bias(size);
      if (b->is_array()) {
        if (b->size() != size) throw std::invalid_argument(name + ".bias: one value for each neuron");
        for (std::size_t i = 0; i < size; i++) bias[i] = quantity(b->as_array()[i], info.input, name + ".bias");
      } else {
        const Distribution d = spec::distribution(*b, info.input, name + ".bias");
        for (std::size_t i = 0; i < size; i++) {
          calx::random::Stream z(st.seed, 0xB1A5u, pop.first + static_cast<std::uint32_t>(i), tag(Purpose::initial, pop.index));
          bias[i] = d.draw(z);
        }
      }
      net.set_bias(pop, std::move(bias));
    }
  }

  if (const Json* projections = j.find("projections"))
    for (const Json& p : projections->as_array()) {
      Population& src = net.population(p.at("source").as_string());
      Population& tgt = net.population(p.at("target").as_string());
      const std::string receptor = p.at("receptor").as_string();
      const Dimension wd = tgt.receptor_dimension(tgt.receptor(receptor));
      const std::string what = src.name + " -> " + tgt.name;
      Connectivity c;
      const Json& rule = p.at("rule");
      using K = Connectivity::Kind;
      if (rule.has("all_to_all")) c.kind = K::all_to_all;
      else if (rule.has("one_to_one")) c.kind = K::one_to_one;
      else if (rule.has("uniform")) c.kind = K::uniform;
      else if (const Json* v = rule.find("fixed_probability")) { c.kind = K::fixed_probability; c.probability = v->as_number(); }
      else if (const Json* v = rule.find("fixed_indegree")) { c.kind = K::fixed_indegree; c.degree = static_cast<std::size_t>(v->as_number()); }
      else if (const Json* v = rule.find("fixed_outdegree")) { c.kind = K::fixed_outdegree; c.degree = static_cast<std::size_t>(v->as_number()); }
      else if (const Json* v = rule.find("pairs")) {
        c.kind = K::pairs;
        for (const Json& pr : v->as_array()) c.pairs.push_back({static_cast<std::uint32_t>(pr.as_array().at(0).as_number()), static_cast<std::uint32_t>(pr.as_array().at(1).as_number())});
        if (const Json* w = rule.find("weights")) for (const Json& x : w->as_array()) c.pair_weights.push_back(quantity(x, wd, what + " weight"));
        if (const Json* d = rule.find("delays")) for (const Json& x : d->as_array()) c.pair_delays.push_back(quantity(x, dim::time, what + " delay"));
      } else {
        throw std::invalid_argument(what + ": the rule is all_to_all, one_to_one, uniform, fixed_probability, fixed_indegree, fixed_outdegree or pairs");
      }
      if (const Json* v = rule.find("autapses")) c.autapses = v->as_bool();
      if (const Json* v = rule.find("multapses")) c.multapses = v->as_bool();
      const Distribution weight = p.has("weight") ? spec::distribution(p.at("weight"), wd, what + " weight") : Distribution::constant(0);
      const Distribution delay = p.has("delay") ? spec::distribution(p.at("delay"), dim::time, what + " delay") : Distribution::constant(st.resolution);
      Plasticity pl;
      if (const Json* sy = p.find("synapse")) {
        const std::string model = sy->has("model") ? sy->at("model").as_string() : "static";
        if (model == "static") pl.rule = Rule::static_weight;
        else if (model == "stdp") pl.rule = Rule::stdp;
        else if (model == "triplet") pl.rule = Rule::triplet;
        else if (model == "tsodyks") pl.rule = Rule::tsodyks;
        else throw std::invalid_argument(what + ": the synapse is static, stdp, triplet or tsodyks");
        auto dimensionless = [&](std::string_view key, double& field) { if (const Json* v = sy->find(key)) field = quantity(*v, dim::one, what + "." + std::string(key)); };
        auto time = [&](std::string_view key, double& field) { if (const Json* v = sy->find(key)) field = quantity(*v, dim::time, what + "." + std::string(key)); };
        dimensionless("lambda", pl.lambda); dimensionless("alpha", pl.alpha); dimensionless("mu_plus", pl.mu_plus); dimensionless("mu_minus", pl.mu_minus);
        time("tau_plus", pl.tau_plus); time("tau_minus", pl.tau_minus);
        dimensionless("A2_plus", pl.A2_plus); dimensionless("A3_plus", pl.A3_plus); dimensionless("A2_minus", pl.A2_minus); dimensionless("A3_minus", pl.A3_minus);
        time("tau_x", pl.tau_x); time("tau_y", pl.tau_y);
        if (pl.rule == Rule::triplet) { time("tau_plus", pl.triplet_tau_plus); time("tau_minus", pl.triplet_tau_minus); }
        dimensionless("U", pl.U); time("tau_rec", pl.tau_rec); time("tau_fac", pl.tau_fac);
        if (const Json* v = sy->find("w_max")) pl.w_max = quantity(*v, wd, what + ".w_max");
      }
      net.connect(src, tgt, receptor, std::move(c), weight, delay, pl);
    }

  if (const Json* devices = j.find("devices"))
    for (const Json& d : devices->as_array()) {
      const std::string model = d.at("model").as_string();
      Population& tgt = net.population(d.at("target").as_string());
      const Dimension in = tgt.info().input;
      std::unique_ptr<Device> dev;
      std::size_t receptor = 0;
      auto weight = [&](std::string_view what) {
        receptor = tgt.receptor(d.at("receptor").as_string());
        return quantity(d.at("weight"), tgt.receptor_dimension(receptor), what);
      };
      if (model == "poisson") {
        auto x = std::make_unique<PoissonInput>();
        x->rate = quantity(d.at("rate"), dim::frequency, "poisson rate");
        x->weight = weight("poisson weight");
        x->receptor = receptor;
        dev = std::move(x);
      } else if (model == "spike_times") {
        auto x = std::make_unique<SpikeTimes>();
        for (const Json& t : d.at("times").as_array()) x->times.push_back(std::llround(quantity(t, dim::time, "spike time") / st.resolution));
        std::sort(x->times.begin(), x->times.end());
        x->weight = weight("spike_times weight");
        x->receptor = receptor;
        dev = std::move(x);
      } else if (model == "dc") {
        auto x = std::make_unique<CurrentInput>();
        x->amplitude = quantity(d.at("amplitude"), in, "dc amplitude");
        dev = std::move(x);
      } else if (model == "step_current") {
        auto x = std::make_unique<CurrentInput>();
        for (const Json& t : d.at("times").as_array()) x->times.push_back(quantity(t, dim::time, "step_current time"));
        for (const Json& a : d.at("amplitudes").as_array()) x->amplitudes.push_back(quantity(a, in, "step_current amplitude"));
        if (x->times.size() != x->amplitudes.size()) throw std::invalid_argument("step_current: one amplitude per time");
        dev = std::move(x);
      } else if (model == "noise") {
        auto x = std::make_unique<NoiseInput>();
        x->mean = d.has("mean") ? quantity(d.at("mean"), in, "noise mean") : 0;
        x->sd = quantity(d.at("sd"), in, "noise sd");
        if (const Json* v = d.find("interval")) x->interval = std::max<std::int64_t>(1, std::llround(quantity(*v, dim::time, "noise interval") / st.resolution));
        dev = std::move(x);
      } else if (model == "sine") {
        auto x = std::make_unique<SineInput>();
        x->offset = d.has("offset") ? quantity(d.at("offset"), in, "sine offset") : 0;
        x->amplitude = quantity(d.at("amplitude"), in, "sine amplitude");
        x->frequency = quantity(d.at("frequency"), dim::frequency, "sine frequency");
        x->phase = d.has("phase") ? quantity(d.at("phase"), dim::one, "sine phase") : 0;
        dev = std::move(x);
      } else {
        throw std::invalid_argument("a device is poisson, spike_times, dc, step_current, noise or sine, not \"" + model + "\"");
      }
      dev->name = d.has("name") ? d.at("name").as_string() : model;
      dev->target = &tgt;
      dev->first = static_cast<std::size_t>(spec::number(d, "first", 0));
      dev->count = static_cast<std::size_t>(spec::number(d, "count", 0));
      if (const Json* v = d.find("start")) dev->start = quantity(*v, dim::time, "device start");
      if (const Json* v = d.find("stop")) dev->stop = quantity(*v, dim::time, "device stop");
      net.add_device(std::move(dev));
    }

  if (const Json* recorders = j.find("recorders"))
    for (const Json& r : recorders->as_array()) {
      const std::string model = r.at("model").as_string();
      if (model == "spikes" || model == "rate") {
        Population& p = net.population(r.at("population").as_string());
        auto& rec = net.record_spikes(p, static_cast<std::size_t>(spec::number(r, "first", 0)), static_cast<std::size_t>(spec::number(r, "count", 0)));
        if (model == "spikes") out.spikes.push_back(&rec);
        else out.rates.push_back({&rec, r.has("bin") ? quantity(r.at("bin"), dim::time, "rate bin") : 5e-3});
      } else if (model == "state") {
        Population& p = net.population(r.at("population").as_string());
        std::vector<std::size_t> neurons, comps;
        for (const Json& n : r.at("neurons").as_array()) neurons.push_back(static_cast<std::size_t>(n.as_number()));
        if (const Json* cs = r.find("components")) for (const Json& c : cs->as_array()) comps.push_back(p.component(c.as_string()));
        else for (std::size_t c = 0; c < p.components(); c++) comps.push_back(c);
        const auto every = r.has("interval") ? std::max<std::int64_t>(1, std::llround(quantity(r.at("interval"), dim::time, "state interval") / st.resolution)) : 1;
        out.states.push_back(&net.record_state(p, neurons, comps, every));
      } else if (model == "weights") {
        const auto k = static_cast<std::size_t>(r.at("projection").as_number());
        if (k >= net.projections().size()) throw std::out_of_range("weights: no projection " + std::to_string(k));
        const auto every = r.has("interval") ? std::llround(quantity(r.at("interval"), dim::time, "weights interval") / st.resolution) : 0;
        out.weights.push_back(&net.record_weights(*net.projections()[k], every));
      } else {
        throw std::invalid_argument("a recorder is spikes, rate, state or weights, not \"" + model + "\"");
      }
    }
  return out;
}

// The results of a run, as JSON: times in seconds, quantities in SI units with their units named.
inline Json results(const Built& b) {
  const Network& net = *b.network;
  const double h = net.h();
  Json out = Json::object();
  out.set("time", net.time());
  out.set("resolution", h);
  const auto& st = net.statistics();
  std::size_t neurons = 0;
  for (const auto& p : net.populations()) neurons += p->size;
  Json stats = Json::object();
  stats.set("neurons", neurons);
  stats.set("synapses", net.synapses());
  stats.set("threads", net.settings().threads);
  stats.set("spikes", st.spikes);
  stats.set("events", st.events);
  stats.set("build_seconds", st.build);
  stats.set("run_seconds", st.wall);
  stats.set("realtime_factor", net.time() > 0 ? st.wall / net.time() : 0.0);
  stats.set("min_delay_steps", static_cast<double>(net.min_delay()));
  out.set("statistics", stats);
  Json pops = Json::array();
  for (const auto& p : net.populations()) {
    Json q = Json::object();
    q.set("name", p->name);
    q.set("model", std::string(p->info().name));
    q.set("size", p->size);
    q.set("first_gid", p->first);
    pops.push(q);
  }
  out.set("populations", pops);
  Json spikes = Json::array();
  for (const SpikeRecorder* r : b.spikes) {
    Json q = Json::object(), times = Json::array(), senders = Json::array();
    for (const Spike& s : r->spikes) { times.push(s.time * h); senders.push(s.gid - r->population->first); }
    q.set("population", r->population->name);
    q.set("first", r->first);
    q.set("count", r->count);
    q.set("times", times);
    q.set("senders", senders);
    spikes.push(q);
  }
  out.set("spikes", spikes);
  Json rates = Json::array();
  for (const auto& [r, bin] : b.rates) {
    const auto n = static_cast<std::size_t>(std::ceil(net.time() / bin - 1e-9));
    std::vector<double> counts(std::max<std::size_t>(n, 1), 0);
    for (const Spike& s : r->spikes) {
      const auto k = static_cast<std::size_t>((s.time * h - 1e-12) / bin);
      if (k < counts.size()) counts[k]++;
    }
    Json q = Json::object(), t = Json::array(), v = Json::array();
    for (std::size_t k = 0; k < counts.size(); k++) { t.push((k + 0.5) * bin); v.push(counts[k] / (bin * static_cast<double>(r->count))); }
    q.set("population", r->population->name);
    q.set("bin", bin);
    q.set("times", t);
    q.set("rate", v);
    rates.push(q);
  }
  out.set("rates", rates);
  Json states = Json::array();
  for (const StateRecorder* r : b.states) {
    Json q = Json::object(), times = Json::array(), comps = Json::array(), units = Json::array(), values = Json::array(), ns = Json::array();
    for (Step t : r->times) times.push(t * h);
    for (auto c : r->components) {
      comps.push(std::string(r->population->info().components[c].name));
      units.push(pu::symbol(r->population->info().components[c].dimension));
    }
    for (std::size_t k = 0; k < r->neurons.size(); k++) {
      ns.push(r->neurons[k]);
      Json series = Json::array();
      for (double x : r->values[k]) series.push(x);
      values.push(series);
    }
    q.set("population", r->population->name);
    q.set("neurons", ns);
    q.set("components", comps);
    q.set("units", units);
    q.set("times", times);
    q.set("values", values);  // per neuron: samples x components, flattened
    states.push(q);
  }
  out.set("states", states);
  Json weights = Json::array();
  for (const WeightRecorder* r : b.weights) {
    Json q = Json::object(), t = Json::array(), m = Json::array(), sd = Json::array();
    for (std::size_t k = 0; k < r->times.size(); k++) { t.push(r->times[k] * h); m.push(r->mean[k]); sd.push(r->sd[k]); }
    q.set("projection", r->projection->index);
    q.set("times", t);
    q.set("mean", m);
    q.set("sd", sd);
    weights.push(q);
  }
  out.set("weights", weights);
  return out;
}

inline std::string_view method_name(pd::Method m) {
  switch (m) {
    case pd::Method::exact: return "exact";
    case pd::Method::euler: return "euler";
    case pd::Method::heun: return "heun";
    case pd::Method::rk4: return "rk4";
    case pd::Method::dopri5: return "dopri5";
    case pd::Method::rush_larsen: return "rush_larsen";
  }
  return "?";
}

// Every model, as JSON: for the interfaces that offer them.
inline Json models_json() {
  Json out = Json::array();
  for (const ModelInfo& m : model_infos()) {
    Json q = Json::object();
    q.set("name", std::string(m.name));
    q.set("summary", std::string(m.summary));
    q.set("citation", std::string(m.citation));
    q.set("input", pu::symbol(m.input));
    q.set("method", std::string(method_name(m.method)));
    q.set("linear", m.linear);
    Json ps = Json::array(), cs = Json::array(), rs = Json::array();
    for (const auto& p : m.parameters) {
      Json x = Json::object();
      x.set("name", std::string(p.name));
      x.set("unit", pu::symbol(p.dimension));
      x.set("default", p.value);
      x.set("doc", std::string(p.doc));
      ps.push(x);
    }
    for (const auto& c : m.components) {
      Json x = Json::object();
      x.set("name", std::string(c.name));
      x.set("unit", pu::symbol(c.dimension));
      x.set("doc", std::string(c.doc));
      cs.push(x);
    }
    for (const auto& r : m.receptors) {
      Json x = Json::object();
      x.set("name", std::string(r.name));
      x.set("component", std::string(m.components[r.component].name));
      x.set("unit", pu::symbol(m.components[r.component].dimension));
      x.set("doc", std::string(r.doc));
      rs.push(x);
    }
    q.set("parameters", ps);
    q.set("components", cs);
    q.set("receptors", rs);
    out.push(q);
  }
  return out;
}

}  // namespace neuroscience::snn
