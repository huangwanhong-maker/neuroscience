// A network of spiking neurons: populations, the projections between them, the devices
// that drive them, the recorders that watch them, and the simulation that runs them.
//
// Parallel and exact at once. The neurons of every population are divided among threads,
// and each thread owns its neurons, their rings of arrivals, and the synapses that end on
// them (Morrison, Mehring, Geisel, Aertsen and Diesmann 2005, Neural Comput. 17, 1776-1801:
// the synapses are stored on the target's side). A run proceeds in windows of the
// shortest delay, W = d_min steps: within a window no spike can reach any neuron (it
// arrives at least d_min steps after it is sent), so every thread integrates its neurons
// through the window without waiting; then the spikes of all threads are merged in the
// order (time, gid) and every thread delivers all of them to the synapses it owns. No two
// threads write the same memory, and each target sums its inputs in the same order whatever
// the number of threads; with the random streams of calx keyed by what they are for, the
// result is the same, bit for bit, for one thread or many.
//
// Connectivity is generated for each target from a stream keyed by the projection and the
// target (or the source, for fixed out-degree), so that it too is independent of the
// threads, and stored by rows of presynaptic neurons (calx::linalg::compress).

#pragma once

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdint>
#include <limits>
#include <memory>
#include <numeric>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

#include <calx/linalg/sparse.hpp>
#include <calx/random/stream.hpp>
#include <calx/scheduler/thread_pool.hpp>

#include "population.hpp"
#include "synapses.hpp"

namespace neuroscience::snn {

struct Settings {
  double resolution = 0.1e-3;  // h, s
  std::uint64_t seed = 1;
  std::size_t threads = 1;
  pd::Stepping stepping{pd::Method::exact, 1, {1e-6, 1e-6}};  // exact: each model's own method
};

// A value drawn for each synapse (a weight, a delay) or each neuron (a bias, a state).
struct Distribution {
  enum class Kind { constant, uniform, normal, lognormal } kind = Kind::constant;
  double a = 0, b = 0;  // constant: a; uniform: [a, b); normal: mean a, sd b; lognormal: mu a, sigma b of the log
  double low = -std::numeric_limits<double>::infinity(), high = std::numeric_limits<double>::infinity();
  static Distribution constant(double v) { return {Kind::constant, v, 0}; }
  bool is_constant() const { return kind == Kind::constant; }
  double draw(calx::random::Stream& r) const {
    double v = a;
    switch (kind) {
      case Kind::constant: return a;
      case Kind::uniform: v = r.uniform(a, b); break;
      case Kind::normal: v = r.normal(a, b); break;
      case Kind::lognormal: v = r.lognormal(a, b); break;
    }
    return std::clamp(v, low, high);
  }
};

struct Connectivity {
  enum class Kind { one_to_one, all_to_all, fixed_probability, fixed_indegree, fixed_outdegree, pairs, uniform } kind = Kind::all_to_all;
  double probability = 0;   // fixed_probability
  std::size_t degree = 0;   // fixed_indegree, fixed_outdegree
  bool autapses = true;     // a neuron onto itself, when source and target are one population
  bool multapses = true;    // more than one synapse between a pair (fixed degrees)
  std::vector<std::pair<std::uint32_t, std::uint32_t>> pairs;  // (source, target), local indices
  std::vector<double> pair_weights, pair_delays;               // optional, one per pair

  static Connectivity all_to_all(bool autapses = true) { Connectivity c; c.kind = Kind::all_to_all; c.autapses = autapses; return c; }
  static Connectivity one_to_one() { Connectivity c; c.kind = Kind::one_to_one; return c; }
  static Connectivity uniform(bool autapses = true) { Connectivity c; c.kind = Kind::uniform; c.autapses = autapses; return c; }
  static Connectivity fixed_probability(double p, bool autapses = true) {
    Connectivity c; c.kind = Kind::fixed_probability; c.probability = p; c.autapses = autapses; return c;
  }
  static Connectivity fixed_indegree(std::size_t k, bool autapses = true, bool multapses = true) {
    Connectivity c; c.kind = Kind::fixed_indegree; c.degree = k; c.autapses = autapses; c.multapses = multapses; return c;
  }
  static Connectivity fixed_outdegree(std::size_t k, bool autapses = true, bool multapses = true) {
    Connectivity c; c.kind = Kind::fixed_outdegree; c.degree = k; c.autapses = autapses; c.multapses = multapses; return c;
  }
  static Connectivity from_pairs(std::vector<std::pair<std::uint32_t, std::uint32_t>> list) {
    Connectivity c; c.kind = Kind::pairs; c.pairs = std::move(list); return c;
  }
};

class Network;

struct Projection {
  std::uint32_t index = 0;
  Population* source = nullptr;
  Population* target = nullptr;
  std::size_t receptor = 0;
  Connectivity connectivity;
  Distribution weight, delay;  // weight in the receptor's units; delay in s
  Plasticity plasticity;
  // A uniform projection keeps no synapses: every target receives w from every spike of the
  // source (mean-field coupling, all to all, one weight and one delay).
  double uniform_weight = 0;
  std::uint16_t uniform_delay = 1;
  std::vector<SynapseRows> parts;  // per thread
  std::uint16_t min_delay = 1, max_delay = 1;

  std::size_t synapses() const {
    if (connectivity.kind == Connectivity::Kind::uniform) {
      const std::size_t n = source->size * target->size;
      return connectivity.autapses || source != target ? n : n - source->size;
    }
    std::size_t s = 0;
    for (const auto& p : parts) s += p.target.size();
    return s;
  }
};

// ---- devices ------------------------------------------------------------------------------------------

class Device {
 public:
  virtual ~Device() = default;
  std::string name;
  std::uint32_t index = 0;
  Population* target = nullptr;
  std::size_t first = 0, count = 0;  // the target's neurons [first, first + count)
  double start = 0, stop = std::numeric_limits<double>::infinity();
  // Adds the device's input for step k to the neurons of `thread`.
  virtual void apply(Step k, std::size_t thread, double h, std::uint64_t seed) = 0;
  virtual std::string_view kind() const = 0;

 protected:
  Range mine(std::size_t thread) const {
    const Range p = target->parts[thread];
    return {std::max(p.begin, first), std::min(p.end, first + count)};
  }
  bool active(Step k, double h) const { const double t = k * h; return t >= start && t < stop; }
};

// Independent Poisson spike trains of `rate` into each target, each spike of weight w on
// one receptor, arriving at the grid points (Burkitt 2006 for its use as background input).
class PoissonInput final : public Device {
 public:
  double rate = 0, weight = 0;
  std::size_t receptor = 0;
  std::string_view kind() const override { return "poisson"; }
  void apply(Step k, std::size_t thread, double h, std::uint64_t seed) override {
    if (!active(k, h) || rate <= 0) return;
    const Range r = mine(thread);
    double* in = target->arrivals(k + 1, receptor);
    const double lam = rate * h;
    for (std::size_t i = r.begin; i < r.end; i++) {
      calx::random::Stream z(seed, static_cast<std::uint32_t>(k), target->first + static_cast<std::uint32_t>(i), tag(Purpose::poisson, index));
      const auto n = z.poisson(lam);
      if (n) in[i] += static_cast<double>(n) * weight;
    }
  }
};

// Spikes at given times (time indices), into every target, of weight w.
class SpikeTimes final : public Device {
 public:
  std::vector<Step> times;  // sorted
  double weight = 0;
  std::size_t receptor = 0;
  std::string_view kind() const override { return "spike_times"; }
  void apply(Step k, std::size_t thread, double, std::uint64_t) override {
    const auto [lo, hi] = std::equal_range(times.begin(), times.end(), k + 1);
    if (lo == hi) return;
    const double w = weight * static_cast<double>(hi - lo);
    const Range r = mine(thread);
    double* in = target->arrivals(k + 1, receptor);
    for (std::size_t i = r.begin; i < r.end; i++) in[i] += w;
  }
};

// A current (or drive, in the model's input units) constant between start and stop, or
// piecewise constant from given times.
class CurrentInput final : public Device {
 public:
  double amplitude = 0;
  std::vector<double> times, amplitudes;  // a step current: amplitudes[i] from times[i]
  std::string_view kind() const override { return times.empty() ? "dc" : "step_current"; }
  void apply(Step k, std::size_t thread, double h, std::uint64_t) override {
    if (!active(k, h)) return;
    double a = amplitude;
    if (!times.empty()) {
      const double t = k * h + 1e-12;
      const auto it = std::upper_bound(times.begin(), times.end(), t);
      if (it == times.begin()) return;
      a = amplitudes[static_cast<std::size_t>(it - times.begin()) - 1];
    }
    const Range r = mine(thread);
    for (std::size_t i = r.begin; i < r.end; i++) target->current[i] += a;
  }
};

// Gaussian white noise: an independent current mean + sd z into each target, drawn anew
// every `interval` steps (NEST's noise_generator).
class NoiseInput final : public Device {
 public:
  double mean = 0, sd = 0;
  std::int64_t interval = 1;
  std::string_view kind() const override { return "noise"; }
  void apply(Step k, std::size_t thread, double h, std::uint64_t seed) override {
    if (!active(k, h)) return;
    const Range r = mine(thread);
    const auto epoch = static_cast<std::uint32_t>(k / std::max<std::int64_t>(1, interval));
    for (std::size_t i = r.begin; i < r.end; i++) {
      calx::random::Stream z(seed, epoch, target->first + static_cast<std::uint32_t>(i), tag(Purpose::noise, index));
      target->current[i] += mean + sd * z.normal();
    }
  }
};

// A sinusoidal current: offset + amplitude sin(2 pi f t + phase).
class SineInput final : public Device {
 public:
  double offset = 0, amplitude = 0, frequency = 0, phase = 0;
  std::string_view kind() const override { return "sine"; }
  void apply(Step k, std::size_t thread, double h, std::uint64_t) override {
    if (!active(k, h)) return;
    const double a = offset + amplitude * std::sin(2 * std::numbers::pi * frequency * k * h + phase);
    const Range r = mine(thread);
    for (std::size_t i = r.begin; i < r.end; i++) target->current[i] += a;
  }
};

// ---- recorders -----------------------------------------------------------------------------------------

struct SpikeRecorder {
  Population* population = nullptr;
  std::size_t first = 0, count = 0;
  std::vector<Spike> spikes;
};

struct StateRecorder {
  Population* population = nullptr;
  std::vector<std::size_t> neurons;     // local indices, sorted
  std::vector<std::size_t> components;
  std::int64_t interval = 1;            // steps
  std::vector<Step> times;              // the time indices of the samples
  std::vector<std::vector<double>> values;  // per neuron: samples x components
  // the recorded neurons each thread owns: [begin, end) into `neurons`
  std::vector<std::pair<std::size_t, std::size_t>> owned;
};

struct WeightRecorder {
  Projection* projection = nullptr;
  std::int64_t interval = 0;            // steps; 0: at the end only
  std::vector<Step> times;
  std::vector<double> mean, sd;          // over the projection's synapses
};

struct Statistics {
  std::uint64_t spikes = 0, events = 0, steps = 0;
  double wall = 0;     // s spent in run()
  double build = 0;    // s spent building connectivity
};

// ---- the network ----------------------------------------------------------------------------------------

class Network {
 public:
  explicit Network(Settings s = {}) : settings_(s) {
    if (!(s.resolution > 0)) throw std::invalid_argument("the resolution must be positive");
  }

  const Settings& settings() const { return settings_; }
  double h() const { return settings_.resolution; }
  Step now() const { return now_; }
  double time() const { return now_ * h(); }
  const Statistics& statistics() const { return stats_; }
  const std::vector<std::unique_ptr<Population>>& populations() const { return pops_; }
  const std::vector<std::unique_ptr<Projection>>& projections() const { return projs_; }

  template <Model M>
  PopulationOf<M>& add(std::string name, std::size_t n, const typename M::Params& p = {}) {
    auto pop = std::make_unique<PopulationOf<M>>(std::move(name), n, p);
    auto& ref = *pop;
    adopt(std::move(pop));
    return ref;
  }
  Population& adopt(std::unique_ptr<Population> pop) {
    if (prepared_) throw std::logic_error("populations are added before the first run");
    for (const auto& q : pops_) if (q->name == pop->name) throw std::invalid_argument("two populations named \"" + pop->name + "\"");
    pop->index = static_cast<std::uint32_t>(pops_.size());
    pop->first = next_gid_;
    if (static_cast<std::uint64_t>(next_gid_) + pop->size > std::numeric_limits<Gid>::max()) throw std::length_error("too many neurons");
    next_gid_ += static_cast<Gid>(pop->size);
    pops_.push_back(std::move(pop));
    return *pops_.back();
  }
  Population& population(std::string_view name) const {
    for (const auto& p : pops_) if (p->name == name) return *p;
    throw std::invalid_argument("no population \"" + std::string(name) + "\"");
  }

  Projection& connect(Population& source, Population& target, std::string_view receptor, Connectivity c, Distribution weight,
                      Distribution delay, Plasticity plasticity = {}) {
    if (prepared_) throw std::logic_error("projections are made before the first run");
    auto pr = std::make_unique<Projection>();
    pr->index = static_cast<std::uint32_t>(projs_.size());
    pr->source = &source;
    pr->target = &target;
    pr->receptor = target.receptor(receptor);
    pr->connectivity = std::move(c);
    pr->weight = weight;
    pr->delay = delay;
    pr->plasticity = plasticity;
    if (pr->plasticity.plastic() && !(pr->plasticity.w_max > 0)) throw std::invalid_argument("a plastic projection needs w_max > 0");
    if (pr->connectivity.kind == Connectivity::Kind::uniform) {
      if (!weight.is_constant() || !delay.is_constant()) throw std::invalid_argument("a uniform projection has one weight and one delay");
      if (plasticity.rule != Rule::static_weight) throw std::invalid_argument("a uniform projection is static");
    }
    projs_.push_back(std::move(pr));
    return *projs_.back();
  }

  template <class D>
  D& add_device(std::unique_ptr<D> d) {
    if (prepared_) throw std::logic_error("devices are added before the first run");
    if (!d->target) throw std::invalid_argument("a device needs a target");
    if (d->count == 0) d->count = d->target->size - d->first;
    if (d->first + d->count > d->target->size) throw std::out_of_range("a device's neurons exceed its target");
    d->index = static_cast<std::uint32_t>(devices_.size());
    auto& ref = *d;
    devices_.push_back(std::move(d));
    return ref;
  }

  SpikeRecorder& record_spikes(Population& p, std::size_t first = 0, std::size_t count = 0) {
    spike_recorders_.push_back(std::make_unique<SpikeRecorder>(SpikeRecorder{&p, first, count ? count : p.size - first, {}}));
    return *spike_recorders_.back();
  }
  StateRecorder& record_state(Population& p, std::vector<std::size_t> neurons, std::vector<std::size_t> components, std::int64_t interval = 1) {
    if (prepared_) throw std::logic_error("state recorders are added before the first run");
    std::sort(neurons.begin(), neurons.end());
    neurons.erase(std::unique(neurons.begin(), neurons.end()), neurons.end());
    for (auto i : neurons) if (i >= p.size) throw std::out_of_range("a recorded neuron is out of its population");
    for (auto c : components) if (c >= p.components()) throw std::out_of_range("a recorded component is out of its model");
    auto r = std::make_unique<StateRecorder>();
    r->population = &p;
    r->neurons = std::move(neurons);
    r->components = std::move(components);
    r->interval = std::max<std::int64_t>(1, interval);
    r->values.resize(r->neurons.size());
    state_recorders_.push_back(std::move(r));
    return *state_recorders_.back();
  }
  WeightRecorder& record_weights(Projection& p, std::int64_t interval = 0) {
    weight_recorders_.push_back(std::make_unique<WeightRecorder>(WeightRecorder{&p, interval, {}, {}, {}}));
    return *weight_recorders_.back();
  }

  // Sets a per-neuron constant input (in the model's input units).
  void set_bias(Population& p, std::vector<double> bias) {
    if (bias.size() != p.size) throw std::invalid_argument("a bias for every neuron");
    p.bias = std::move(bias);
  }
  // Sets a component of every neuron from a distribution, by streams keyed by the neuron.
  void initialise(Population& p, std::size_t component, const Distribution& d) {
    for (std::size_t i = 0; i < p.size; i++) {
      calx::random::Stream z(settings_.seed, static_cast<std::uint32_t>(component), p.first + static_cast<std::uint32_t>(i), tag(Purpose::initial, p.index));
      p.set(component, i, d.draw(z));
    }
  }

  // Runs for `duration` seconds (rounded to steps).
  void run(double duration);

  std::size_t synapses() const {
    std::size_t s = 0;
    for (const auto& p : projs_) s += p->synapses();
    return s;
  }
  std::uint16_t min_delay() const { return d_min_; }

 private:
  void prepare();
  void build(Projection& pr);
  void deliver(std::size_t thread, const std::vector<Spike>& spikes, std::uint64_t& events);
  void sample(StateRecorder& r, std::size_t thread, Step time);

  Settings settings_;
  std::vector<std::unique_ptr<Population>> pops_;
  std::vector<std::unique_ptr<Projection>> projs_;
  std::vector<std::unique_ptr<Device>> devices_;
  std::vector<std::unique_ptr<SpikeRecorder>> spike_recorders_;
  std::vector<std::unique_ptr<StateRecorder>> state_recorders_;
  std::vector<std::unique_ptr<WeightRecorder>> weight_recorders_;
  std::unique_ptr<calx::scheduler::ThreadPool> pool_;
  std::vector<std::vector<Projection*>> outgoing_;   // by source population
  std::vector<std::vector<Device*>> devices_of_;      // by target population
  std::vector<std::vector<StateRecorder*>> recorders_of_;
  Gid next_gid_ = 0;
  Step now_ = 0;
  std::uint16_t d_min_ = 1, d_max_ = 1;
  bool prepared_ = false;
  Statistics stats_;
};

// ---- implementation --------------------------------------------------------------------------------------

namespace detail {

inline std::uint16_t to_steps(double delay, double h) {
  const double s = std::round(delay / h);
  if (!(s >= 1)) throw std::invalid_argument("a delay must be at least one step (" + std::to_string(delay) + " s at h = " + std::to_string(h) + " s)");
  if (s > 65535) throw std::invalid_argument("a delay must be below 65536 steps");
  return static_cast<std::uint16_t>(s);
}

// k distinct values below n, by Floyd's algorithm (Bentley and Floyd 1987), in the order drawn.
inline void distinct_below(calx::random::Stream& r, std::size_t n, std::size_t k, std::vector<std::uint32_t>& out) {
  out.clear();
  std::vector<std::uint32_t> chosen;
  chosen.reserve(k);
  for (std::size_t j = n - k; j < n; j++) {
    const auto t = static_cast<std::uint32_t>(r.below(j + 1));
    if (std::find(chosen.begin(), chosen.end(), t) == chosen.end()) chosen.push_back(t);
    else chosen.push_back(static_cast<std::uint32_t>(j));
  }
  out = std::move(chosen);
}

}  // namespace detail

inline void Network::build(Projection& pr) {
  using K = Connectivity::Kind;
  const std::size_t T = pool_->size(), Ns = pr.source->size, Nt = pr.target->size;
  const bool same = pr.source == pr.target;
  const auto& c = pr.connectivity;
  const double h = this->h();
  pr.parts.assign(T, {});
  if (c.kind == K::uniform) {
    pr.uniform_weight = pr.weight.a;
    pr.uniform_delay = detail::to_steps(pr.delay.a, h);
    pr.min_delay = pr.max_delay = pr.uniform_delay;
    return;
  }
  if (c.kind == K::one_to_one && Ns != Nt) throw std::invalid_argument("one_to_one needs populations of equal size");
  if (c.kind == K::fixed_probability && !(c.probability >= 0 && c.probability <= 1)) throw std::invalid_argument("a probability lies in [0, 1]");
  if (c.kind == K::fixed_indegree && !c.multapses && c.degree > Ns - (same && !c.autapses ? 1 : 0)) throw std::invalid_argument("fixed_indegree without multapses needs enough sources");
  if (c.kind == K::pairs) {
    if (!c.pair_weights.empty() && c.pair_weights.size() != c.pairs.size()) throw std::invalid_argument("one weight per pair");
    if (!c.pair_delays.empty() && c.pair_delays.size() != c.pairs.size()) throw std::invalid_argument("one delay per pair");
    for (const auto& [s, t] : c.pairs) if (s >= Ns || t >= Nt) throw std::out_of_range("a pair out of its populations");
  }
  std::vector<std::uint16_t> lo(T, std::numeric_limits<std::uint16_t>::max()), hi(T, 1);
  std::vector<std::exception_ptr> errors(T);
  pool_->run([&](std::size_t t) {
    try {
      const Range mine = pr.target->parts[t];
      std::vector<std::uint32_t> src, tgt, sample;
      std::vector<double> w;
      std::vector<std::uint16_t> d;
      auto add = [&](std::uint32_t s, std::uint32_t j, calx::random::Stream& rw) {
        src.push_back(s);
        tgt.push_back(j);
        w.push_back(pr.weight.draw(rw));
        d.push_back(detail::to_steps(pr.delay.draw(rw), h));
      };
      if (c.kind == K::fixed_outdegree) {
        for (std::uint32_t s = 0; s < Ns; s++) {
          calx::random::Stream r(settings_.seed, s, 0, tag(Purpose::connection, pr.index));
          calx::random::Stream rw(settings_.seed, s, 1, tag(Purpose::weight, pr.index));
          std::size_t made = 0;
          if (!c.multapses) {
            const std::size_t pool = Nt - (same && !c.autapses ? 1 : 0);
            if (c.degree > pool) throw std::invalid_argument("fixed_outdegree without multapses needs enough targets");
            detail::distinct_below(r, pool, c.degree, sample);
            for (auto j : sample) {
              if (same && !c.autapses && j >= s) j++;
              // Every thread draws the weights of every synapse of s in order, keeping its own.
              const double wv = pr.weight.draw(rw), dv = pr.delay.draw(rw);
              if (j >= mine.begin && j < mine.end) { src.push_back(s); tgt.push_back(j); w.push_back(wv); d.push_back(detail::to_steps(dv, h)); }
            }
            made = c.degree;
          }
          while (made < c.degree) {
            auto j = static_cast<std::uint32_t>(r.below(Nt));
            if (same && !c.autapses && j == s) continue;
            made++;
            const double wv = pr.weight.draw(rw), dv = pr.delay.draw(rw);
            if (j >= mine.begin && j < mine.end) { src.push_back(s); tgt.push_back(j); w.push_back(wv); d.push_back(detail::to_steps(dv, h)); }
          }
        }
      } else if (c.kind == K::pairs) {
        calx::random::Stream rw(settings_.seed, 0, 1, tag(Purpose::weight, pr.index));
        for (std::size_t k = 0; k < c.pairs.size(); k++) {
          const auto [s, j] = c.pairs[k];
          if (j < mine.begin || j >= mine.end) continue;
          calx::random::Stream rk(settings_.seed, static_cast<std::uint32_t>(k), 2, tag(Purpose::weight, pr.index));
          src.push_back(s);
          tgt.push_back(j);
          w.push_back(c.pair_weights.empty() ? pr.weight.draw(rk) : c.pair_weights[k]);
          d.push_back(detail::to_steps(c.pair_delays.empty() ? pr.delay.draw(rk) : c.pair_delays[k], h));
        }
      } else {
        for (auto j = static_cast<std::uint32_t>(mine.begin); j < mine.end; j++) {
          calx::random::Stream r(settings_.seed, j, 0, tag(Purpose::connection, pr.index));
          calx::random::Stream rw(settings_.seed, j, 1, tag(Purpose::weight, pr.index));
          switch (c.kind) {
            case K::one_to_one:
              if (!(same && !c.autapses)) add(j, j, rw);
              break;
            case K::all_to_all:
              for (std::uint32_t s = 0; s < Ns; s++) if (!(same && !c.autapses && s == j)) add(s, j, rw);
              break;
            case K::fixed_probability: {
              if (c.probability <= 0) break;
              std::int64_t s = -1;
              for (;;) {
                s += 1 + static_cast<std::int64_t>(r.geometric(c.probability));
                if (s >= static_cast<std::int64_t>(Ns)) break;
                if (same && !c.autapses && s == j) continue;
                add(static_cast<std::uint32_t>(s), j, rw);
              }
              break;
            }
            case K::fixed_indegree: {
              if (!c.multapses) {
                const std::size_t pool = Ns - (same && !c.autapses ? 1 : 0);
                detail::distinct_below(r, pool, c.degree, sample);
                for (auto s : sample) add(same && !c.autapses && s >= j ? s + 1 : s, j, rw);
              } else {
                for (std::size_t m = 0; m < c.degree;) {
                  const auto s = static_cast<std::uint32_t>(r.below(Ns));
                  if (same && !c.autapses && s == j) continue;
                  add(s, j, rw);
                  m++;
                }
              }
              break;
            }
            default: break;
          }
        }
      }
      // By rows of presynaptic neurons, stably.
      std::vector<std::uint64_t> order;
      const auto csr = calx::linalg::compress<std::uint32_t>(Ns, Nt, src, tgt, &order);
      SynapseRows& q = pr.parts[t];
      q.row = csr.row;
      q.target = csr.col;
      q.weight.resize(order.size());
      q.delay.resize(order.size());
      for (std::size_t k = 0; k < order.size(); k++) {
        q.weight[k] = static_cast<Weight>(w[order[k]]);
        q.delay[k] = d[order[k]];
        lo[t] = std::min(lo[t], q.delay[k]);
        hi[t] = std::max(hi[t], q.delay[k]);
      }
      q.allocate_state(pr.plasticity.rule);
    } catch (...) {
      errors[t] = std::current_exception();
    }
  });
  for (auto& e : errors) if (e) std::rethrow_exception(e);
  pr.min_delay = *std::min_element(lo.begin(), lo.end());
  pr.max_delay = *std::max_element(hi.begin(), hi.end());
  if (pr.min_delay == std::numeric_limits<std::uint16_t>::max()) pr.min_delay = pr.max_delay = 1;  // no synapses
}

inline void Network::prepare() {
  const auto t0 = std::chrono::steady_clock::now();
  const std::size_t T = std::max<std::size_t>(1, settings_.threads);
  pool_ = std::make_unique<calx::scheduler::ThreadPool>(T);
  for (auto& p : pops_) {
    p->parts.resize(T);
    for (std::size_t t = 0; t < T; t++) p->parts[t] = calx::scheduler::part(p->size, T, t);
  }
  for (auto& pr : projs_) build(*pr);
  // The window is the shortest delay; the ring holds the longest beyond it.
  std::uint16_t dmin = std::numeric_limits<std::uint16_t>::max(), dmax = 1;
  for (auto& pr : projs_) {
    if (pr->synapses() == 0) continue;
    dmin = std::min(dmin, pr->min_delay);
    dmax = std::max(dmax, pr->max_delay);
  }
  // Without synapses no spike reaches a neuron: a long window only saves synchronisation.
  d_min_ = dmin == std::numeric_limits<std::uint16_t>::max() ? 100 : dmin;
  d_max_ = std::max(dmax, d_min_);
  const std::size_t slots = static_cast<std::size_t>(d_max_) + d_min_ + 2;
  outgoing_.assign(pops_.size(), {});
  devices_of_.assign(pops_.size(), {});
  recorders_of_.assign(pops_.size(), {});
  for (auto& pr : projs_) outgoing_[pr->source->index].push_back(pr.get());
  for (auto& d : devices_) devices_of_[d->target->index].push_back(d.get());
  for (auto& r : state_recorders_) {
    recorders_of_[r->population->index].push_back(r.get());
    r->owned.resize(T);
    for (std::size_t t = 0; t < T; t++) {
      const Range p = r->population->parts[t];
      const auto b = std::lower_bound(r->neurons.begin(), r->neurons.end(), p.begin) - r->neurons.begin();
      const auto e = std::lower_bound(r->neurons.begin(), r->neurons.end(), p.end) - r->neurons.begin();
      r->owned[t] = {static_cast<std::size_t>(b), static_cast<std::size_t>(e)};
    }
  }
  for (auto& p : pops_) {
    p->prepare(h(), settings_.seed, slots, settings_.stepping);
    p->plastic_in.clear();
    p->history.clear();
  }
  for (auto& pr : projs_) {
    if (!pr->plasticity.plastic()) continue;
    Population& tg = *pr->target;
    if (tg.plastic_in.empty()) { tg.plastic_in.assign(tg.size, 0); tg.history.assign(tg.size, {}); }
    for (const auto& q : pr->parts) for (auto j : q.target) tg.plastic_in[j]++;
  }
  // The initial state is the first sample.
  for (auto& r : state_recorders_) for (std::size_t t = 0; t < T; t++) sample(*r, t, now_);
  prepared_ = true;
  stats_.build += std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
}

inline void Network::sample(StateRecorder& r, std::size_t thread, Step time) {
  if (time % r.interval != 0) return;
  const auto [b, e] = r.owned[thread];
  for (std::size_t k = b; k < e; k++)
    for (auto c : r.components) r.values[k].push_back(r.population->get(c, r.neurons[k]));
  if (thread == 0) r.times.push_back(time);
}

inline void Network::deliver(std::size_t t, const std::vector<Spike>& spikes, std::uint64_t& events) {
  const double hh = h();
  std::size_t at = 0;
  while (at < spikes.size()) {
    // Spikes of one source population at one time, together (uniform projections use the count).
    const Spike& first = spikes[at];
    std::size_t pi = static_cast<std::size_t>(std::upper_bound(pops_.begin(), pops_.end(), first.gid,
                                                               [](Gid g, const std::unique_ptr<Population>& p) { return g < p->first; }) - pops_.begin()) - 1;
    Population& src = *pops_[pi];
    std::size_t end = at;
    while (end < spikes.size() && spikes[end].time == first.time && spikes[end].gid < src.first + src.size) end++;
    for (Projection* pr : outgoing_[pi]) {
      Population& tg = *pr->target;
      if (pr->connectivity.kind == Connectivity::Kind::uniform) {
        const Range mine = tg.parts[t];
        double* in = tg.arrivals(first.time + pr->uniform_delay, pr->receptor);
        const double w = pr->uniform_weight * static_cast<double>(end - at);
        for (std::size_t j = mine.begin; j < mine.end; j++) in[j] += w;
        events += (end - at) * mine.size();
        if (!pr->connectivity.autapses && &src == &tg)
          for (std::size_t k = at; k < end; k++) {
            const std::size_t j = spikes[k].gid - src.first;
            if (j >= mine.begin && j < mine.end) { in[j] -= pr->uniform_weight; events--; }
          }
        continue;
      }
      SynapseRows& q = pr->parts[t];
      const bool plastic = pr->plasticity.rule != Rule::static_weight;
      // The slot of s + d without a division per synapse: d < slots, so one subtraction wraps it.
      const std::size_t S = tg.slots, R = tg.receptors(), N = tg.size, r = pr->receptor;
      double* const ring = tg.ring.data();
      for (std::size_t k = at; k < end; k++) {
        const std::size_t i = spikes[k].gid - src.first;
        const Step s = spikes[k].time;
        const std::size_t s_mod = static_cast<std::size_t>(s) % S;
        const auto b = q.row[i], e = q.row[i + 1];
        events += e - b;
        if (plastic) {
          for (auto m = b; m < e; m++) {
            const std::uint32_t j = q.target[m];
            const double w = transmit(q, m, s, hh, pr->plasticity, tg.history.empty() ? nullptr : &tg.history[j]);
            std::size_t slot = s_mod + q.delay[m];
            if (slot >= S) slot -= S;
            ring[(slot * R + r) * N + j] += w;
          }
        } else {
          const std::uint32_t* tgt = q.target.data();
          const Weight* wt = q.weight.data();
          const std::uint16_t* dl = q.delay.data();
          for (auto m = b; m < e; m++) {
            std::size_t slot = s_mod + dl[m];
            if (slot >= S) slot -= S;
            ring[(slot * R + r) * N + tgt[m]] += wt[m];
          }
        }
      }
    }
    at = end;
  }
}

inline void Network::run(double duration) {
  if (!prepared_) prepare();
  const auto t0 = std::chrono::steady_clock::now();
  const Step steps = static_cast<Step>(std::llround(duration / h()));
  const Step end = now_ + steps;
  const std::size_t T = pool_->size();
  std::vector<std::vector<Spike>> produced(T);
  std::vector<std::uint64_t> events(T, 0);
  std::vector<Spike> all;
  while (now_ < end) {
    const Step w = std::min<Step>(d_min_, end - now_);
    const Step from = now_;
    pool_->run([&](std::size_t t) {
      for (Step k = from; k < from + w; k++)
        for (auto& p : pops_) {
          for (Device* d : devices_of_[p->index]) d->apply(k, t, h(), settings_.seed);
          p->update(k, t, produced[t]);
          for (StateRecorder* r : recorders_of_[p->index]) sample(*r, t, k + 1);
        }
    });
    all.clear();
    for (auto& v : produced) { all.insert(all.end(), v.begin(), v.end()); v.clear(); }
    std::sort(all.begin(), all.end());
    pool_->run([&](std::size_t t) {
      // The postsynaptic spikes of the window, for the plastic synapses onto them, first.
      for (const Spike& sp : all) {
        const std::size_t pi = static_cast<std::size_t>(std::upper_bound(pops_.begin(), pops_.end(), sp.gid,
                                                                         [](Gid g, const std::unique_ptr<Population>& p) { return g < p->first; }) - pops_.begin()) - 1;
        Population& p = *pops_[pi];
        if (p.plastic_in.empty()) continue;
        const std::size_t i = sp.gid - p.first;
        if (i >= p.parts[t].begin && i < p.parts[t].end && p.plastic_in[i]) p.history[i].push_back({sp.time, 0});
      }
      deliver(t, all, events[t]);
      for (auto& p : pops_) {
        if (p->plastic_in.empty()) continue;
        for (std::size_t i = p->parts[t].begin; i < p->parts[t].end; i++) {
          auto& hst = p->history[i];
          while (!hst.empty() && hst.front().used >= p->plastic_in[i]) hst.pop_front();
        }
      }
    });
    for (auto& r : spike_recorders_) {
      const Gid lo = r->population->first + static_cast<Gid>(r->first), hi = lo + static_cast<Gid>(r->count);
      for (const Spike& sp : all) if (sp.gid >= lo && sp.gid < hi) r->spikes.push_back(sp);
    }
    stats_.spikes += all.size();
    now_ += w;
    for (auto& r : weight_recorders_) {
      const bool due = r->interval > 0 ? (now_ / r->interval != (now_ - w) / r->interval) : now_ == end;
      if (!due) continue;
      double s1 = 0, s2 = 0;
      std::size_t n = 0;
      for (const auto& q : r->projection->parts) for (Weight x : q.weight) { s1 += x; s2 += static_cast<double>(x) * x; n++; }
      r->times.push_back(now_);
      r->mean.push_back(n ? s1 / n : 0);
      r->sd.push_back(n > 1 ? std::sqrt(std::max(0.0, (s2 - s1 * s1 / n) / (n - 1))) : 0);
    }
  }
  for (auto e : events) stats_.events += e;
  stats_.steps += static_cast<std::uint64_t>(steps);
  stats_.wall += std::chrono::duration<double>(std::chrono::steady_clock::now() - t0).count();
}

}  // namespace neuroscience::snn
