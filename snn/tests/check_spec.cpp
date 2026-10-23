// Checks of the JSON specification: a network written as JSON is the network written in
// C++, spike for spike; quantities of the wrong dimension, unknown models and parameters
// are refused with their reason; the results name their units; every model is described.

#include <neuroscience/snn/snn.hpp>
#include <calx/verification/check.hpp>

#include <stdexcept>
#include <string>

using namespace neuroscience::snn;

namespace {

const char* BRUNEL = R"({
  "resolution": "0.1 ms", "duration": "200 ms", "seed": 12, "threads": 3,
  "populations": [
    {"name": "E", "model": "lif_psc_delta", "size": 800,
     "parameters": {"tau_m": "20 ms", "t_ref": "2 ms", "E_L": "0 mV", "V_reset": "10 mV", "V_th": "20 mV"},
     "initial": {"V": {"uniform": ["0 mV", "20 mV"]}}},
    {"name": "I", "model": "lif_psc_delta", "size": 200,
     "parameters": {"tau_m": "20 ms", "t_ref": "2 ms", "E_L": "0 mV", "V_reset": "10 mV", "V_th": "20 mV"},
     "initial": {"V": {"uniform": ["0 mV", "20 mV"]}}}
  ],
  "projections": [
    {"source": "E", "target": "E", "receptor": "delta", "rule": {"fixed_indegree": 80, "autapses": false}, "weight": "0.1 mV", "delay": "1.5 ms"},
    {"source": "I", "target": "E", "receptor": "delta", "rule": {"fixed_indegree": 20, "autapses": false}, "weight": "-0.5 mV", "delay": "1.5 ms"},
    {"source": "E", "target": "I", "receptor": "delta", "rule": {"fixed_indegree": 80, "autapses": false}, "weight": "0.1 mV", "delay": "1.5 ms"},
    {"source": "I", "target": "I", "receptor": "delta", "rule": {"fixed_indegree": 20, "autapses": false}, "weight": "-0.5 mV", "delay": "1.5 ms"}
  ],
  "devices": [
    {"model": "poisson", "target": "E", "rate": "20 kHz", "weight": "0.1 mV", "receptor": "delta"},
    {"model": "poisson", "target": "I", "rate": "20 kHz", "weight": "0.1 mV", "receptor": "delta"}
  ],
  "recorders": [
    {"model": "spikes", "population": "E"},
    {"model": "rate", "population": "E", "bin": "10 ms"},
    {"model": "state", "population": "E", "neurons": [0, 5], "components": ["V"], "interval": "1 ms"}
  ]
})";

std::string refusal(const std::string& text) {
  try {
    Built b = build(Json::parse(text));
    b.network->run(1e-3);
  } catch (const std::exception& e) {
    return e.what();
  }
  return "";
}

}  // namespace

int main() {
  calx::verification::Suite s;

  // ---- the same network, written as JSON and in C++ -------------------------------------------------------
  Built b = build(Json::parse(BRUNEL));
  b.network->run(b.duration);
  const auto& from_json = b.spikes.at(0)->spikes;
  {
    Network net({0.1e-3, 12, 3});
    models::LifPscDelta::Params p;
    p.tau_m = 20e-3; p.t_ref = 2e-3; p.E_L = 0; p.V_reset = 10e-3; p.V_th = 20e-3;
    auto& E = net.add<models::LifPscDelta>("E", 800, p);
    auto& I = net.add<models::LifPscDelta>("I", 200, p);
    net.initialise(E, 0, {Distribution::Kind::uniform, 0, 20e-3});
    net.initialise(I, 0, {Distribution::Kind::uniform, 0, 20e-3});
    for (Population* t : {static_cast<Population*>(&E), static_cast<Population*>(&I)}) {
      net.connect(E, *t, "delta", Connectivity::fixed_indegree(80, false), Distribution::constant(0.1e-3), Distribution::constant(1.5e-3));
      net.connect(I, *t, "delta", Connectivity::fixed_indegree(20, false), Distribution::constant(-0.5e-3), Distribution::constant(1.5e-3));
    }
    for (Population* t : {static_cast<Population*>(&E), static_cast<Population*>(&I)}) {
      auto x = std::make_unique<PoissonInput>();
      x->target = t;
      x->rate = 20e3;
      x->weight = 0.1e-3;
      net.add_device(std::move(x));
    }
    auto& r = net.record_spikes(E);
    net.run(0.2);
    // The projections and devices are made in the JSON's order (E->E, I->E, E->I, I->I), since the
    // streams of connectivity and input are keyed by their indices.
    bool same = r.spikes.size() == from_json.size() && !r.spikes.empty();
    for (std::size_t i = 0; same && i < r.spikes.size(); i++) same &= r.spikes[i].time == from_json[i].time && r.spikes[i].gid == from_json[i].gid;
    s.require("spec: a network written as JSON is the network written in C++, spike for spike", same, std::to_string(r.spikes.size()) + " spikes");
  }
  {
    // Built again from JSON with 1 thread: the same spikes.
    Json one = Json::parse(BRUNEL);
    one.set("threads", 1);
    Built c = build(one);
    c.network->run(c.duration);
    const auto& other = c.spikes.at(0)->spikes;
    bool same = from_json.size() == other.size() && !other.empty();
    for (std::size_t i = 0; same && i < other.size(); i++) same &= from_json[i].time == other[i].time && from_json[i].gid == other[i].gid;
    s.require("spec: a network written as JSON runs the same on 3 threads and on 1", same, std::to_string(other.size()) + " spikes");
  }
  // ---- the results ------------------------------------------------------------------------------------------
  {
    const Json r = results(b);
    const Json& st = r.at("states").as_array().at(0);
    const Json& rate = r.at("rates").as_array().at(0);
    const double mean_rate = static_cast<double>(from_json.size()) / 800 / 0.2;
    double binned = 0;
    for (const Json& v : rate.at("rate").as_array()) binned += v.as_number();
    binned /= static_cast<double>(rate.at("rate").size());
    s.require("spec: the results name the units of what they record", st.at("units").as_array().at(0).as_string() == "V" && st.at("components").as_array().at(0).as_string() == "V");
    s.require("spec: a state recorder samples every interval, the initial state first", st.at("times").size() == 201 && st.at("values").as_array().at(0).size() == 201);
    s.check("spec: the binned rate averages to the mean rate (relative)", calx::verification::relative(binned, mean_rate), 1e-12);
    s.require("spec: the results round-trip through JSON text", Json::parse(r.dump()).at("spikes").as_array().at(0).at("times").size() == from_json.size());
  }
  // ---- refusals -----------------------------------------------------------------------------------------------
  {
    const std::string base = R"({"resolution": "0.1 ms", "populations": [{"name": "a", "model": "lif_psc_exp", "size": 2)";
    const std::string wrong_dim = refusal(base + R"(}], "projections": [{"source": "a", "target": "a", "receptor": "excitatory", "rule": {"all_to_all": true}, "weight": "1 nS", "delay": "1 ms"}]})");
    s.require("spec: a conductance is refused as the weight of a current-based receptor", wrong_dim.find("dimension") != std::string::npos, wrong_dim);
    const std::string bad_model = refusal(R"({"populations": [{"name": "a", "model": "lif_psc_cubic", "size": 2}]})");
    s.require("spec: an unknown model is refused", bad_model.find("no model") != std::string::npos, bad_model);
    const std::string bad_param = refusal(base + R"(, "parameters": {"tau_q": "1 ms"}}]})");
    s.require("spec: an unknown parameter is refused, naming the model", bad_param.find("no parameter") != std::string::npos && bad_param.find("lif_psc_exp") != std::string::npos, bad_param);
    const std::string bare = refusal(base + R"(, "parameters": {"tau_m": 0.02}}]})");
    s.require("spec: a bare number for a dimensioned quantity is refused", bare.find("unit") != std::string::npos, bare);
    const std::string short_delay = refusal(base + R"(}], "projections": [{"source": "a", "target": "a", "receptor": "excitatory", "rule": {"all_to_all": true}, "weight": "1 pA", "delay": "0.01 ms"}]})");
    s.require("spec: a delay shorter than a step is refused", short_delay.find("at least one step") != std::string::npos, short_delay);
  }
  // ---- every model is described ------------------------------------------------------------------------------
  {
    const Json m = models_json();
    bool complete = m.size() == std::tuple_size_v<AllModels>;
    for (const Json& x : m.as_array()) complete &= x.at("citation").as_string().size() > 10 && x.at("receptors").size() >= 1 && x.at("components").size() >= 1;
    s.require("spec: every model is described with its citation, parameters, components and receptors", complete, std::to_string(m.size()) + " models");
  }
  return s.done();
}
