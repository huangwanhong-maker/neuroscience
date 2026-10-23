// Checks of the network: delays deliver at exactly s + d; the connection rules make the
// synapses they promise; Poisson input has its rate; a uniform projection equals the
// explicit all-to-all one; and a recurrent network gives the same spikes, bit for bit, on
// one thread and on several.

#include <neuroscience/snn/snn.hpp>
#include <calx/verification/check.hpp>

#include <cmath>
#include <set>
#include <string>
#include <vector>

using namespace neuroscience::snn;
namespace u = physis::units::unit;

namespace {

// A sparse balanced network after Brunel 2000 (model A: g = 5, eta = 2) at a tenth of its size.
struct Brunel {
  std::vector<Spike> spikes;
  std::size_t synapses = 0;
};
Brunel brunel(std::size_t threads, std::size_t NE = 1000, double T = 0.2, std::uint64_t seed = 12) {
  Network net({0.1e-3, seed, threads});
  const std::size_t NI = NE / 4, CE = NE / 10, CI = NI / 10;
  models::LifPscDelta::Params p;
  p.C_m = 250 * u::pF; p.tau_m = 20 * u::ms; p.t_ref = 2 * u::ms;
  p.E_L = 0; p.V_reset = 10 * u::mV; p.V_th = 20 * u::mV;
  auto& E = net.add<models::LifPscDelta>("E", NE, p);
  auto& I = net.add<models::LifPscDelta>("I", NI, p);
  const double J = 0.1 * u::mV, g = 5, d = 1.5 * u::ms;
  const Connectivity ce = Connectivity::fixed_indegree(CE, false, true);
  const Connectivity ci = Connectivity::fixed_indegree(CI, false, true);
  for (Population* tgt : {static_cast<Population*>(&E), static_cast<Population*>(&I)}) {
    net.connect(E, *tgt, "delta", ce, Distribution::constant(J), Distribution::constant(d));
    net.connect(I, *tgt, "delta", ci, Distribution::constant(-g * J), Distribution::constant(d));
  }
  const double nu_thr = p.V_th / (J * CE * p.tau_m);
  for (Population* tgt : {static_cast<Population*>(&E), static_cast<Population*>(&I)}) {
    auto x = std::make_unique<PoissonInput>();
    x->target = tgt;
    x->rate = 2 * nu_thr * CE;
    x->weight = J;
    net.add_device(std::move(x));
  }
  net.initialise(E, 0, {Distribution::Kind::uniform, 0, 20e-3});
  net.initialise(I, 0, {Distribution::Kind::uniform, 0, 20e-3});
  auto& rE = net.record_spikes(E);
  auto& rI = net.record_spikes(I);
  net.run(T);
  Brunel out;
  out.spikes = rE.spikes;
  out.spikes.insert(out.spikes.end(), rI.spikes.begin(), rI.spikes.end());
  out.synapses = net.synapses();
  return out;
}

}  // namespace

int main() {
  calx::verification::Suite s;
  const double h = 0.1e-3;

  // ---- delays ---------------------------------------------------------------------------------------------
  {
    Network net({h, 1, 1});
    auto& a = net.add<models::Parrot>("a", 1);
    auto& b = net.add<models::LifPscExp>("b", 1);
    auto src = std::make_unique<SpikeTimes>();
    src->target = &a;
    src->weight = 1;
    src->times = {50, 120};
    net.add_device(std::move(src));
    net.connect(a, b, "excitatory", Connectivity::all_to_all(), Distribution::constant(10 * u::pA), Distribution::constant(1.5 * u::ms));
    auto& ra = net.record_spikes(a);
    auto& rb = net.record_state(b, {0}, {b.component("I_ex")});
    net.run(0.03);
    // The parrot repeats at 50 and 120; I_ex jumps at 50 + 15 and 120 + 15 steps.
    std::vector<Step> jumps;
    for (std::size_t k = 1; k < rb.times.size(); k++) if (rb.values[0][k] > rb.values[0][k - 1] + 1e-13) jumps.push_back(rb.times[k]);
    s.require("network: a parrot repeats its input at the time it arrives", ra.spikes.size() == 2 && ra.spikes[0].time == 50 && ra.spikes[1].time == 120);
    s.require("network: a spike at s arrives at s + d (1.5 ms = 15 steps)", jumps == std::vector<Step>{65, 135}, std::to_string(jumps.size()) + " jumps");
  }
  // ---- connection rules -------------------------------------------------------------------------------------
  {
    Network net({h, 3, 3});
    auto& a = net.add<models::Parrot>("a", 300);
    auto& b = net.add<models::Parrot>("b", 200);
    auto& indeg = net.connect(a, b, "silent", Connectivity::fixed_indegree(17), Distribution::constant(1), Distribution::constant(h));
    auto& outdeg = net.connect(a, b, "silent", Connectivity::fixed_outdegree(11), Distribution::constant(1), Distribution::constant(h));
    auto& prob = net.connect(a, b, "silent", Connectivity::fixed_probability(0.05), Distribution::constant(1), Distribution::constant(h));
    auto& self = net.connect(a, a, "silent", Connectivity::all_to_all(false), Distribution::constant(1), Distribution::constant(h));
    auto& distinct = net.connect(b, b, "silent", Connectivity::fixed_indegree(199, false, false), Distribution::constant(1), Distribution::constant(h));
    net.run(h);
    s.require("network: fixed_indegree makes exactly K synapses onto each target", indeg.synapses() == 200 * 17);
    s.require("network: fixed_outdegree makes exactly K synapses from each source", outdeg.synapses() == 300 * 11);
    const double n = 300.0 * 200, mean = n * 0.05, sd = std::sqrt(n * 0.05 * 0.95);
    s.check("network: fixed_probability, z of the number of synapses", (static_cast<double>(prob.synapses()) - mean) / sd, 5);
    bool no_autapse = self.synapses() == 300 * 299;
    for (const auto& q : self.parts)
      for (std::size_t i = 0; i + 1 < q.row.size(); i++)
        for (auto k = q.row[i]; k < q.row[i + 1]; k++) no_autapse &= q.target[k] != i;
    s.require("network: all_to_all without autapses connects every pair but none to itself", no_autapse);
    // Without multapses and autapses, 199 of 199 others: every other neuron exactly once.
    bool all_once = distinct.synapses() == 200 * 199;
    std::vector<std::set<std::uint32_t>> sources(200);
    for (const auto& q : distinct.parts)
      for (std::size_t i = 0; i + 1 < q.row.size(); i++)
        for (auto k = q.row[i]; k < q.row[i + 1]; k++) all_once &= sources[q.target[k]].insert(static_cast<std::uint32_t>(i)).second && q.target[k] != i;
    s.require("network: fixed_indegree without multapses draws distinct sources (Floyd's algorithm)", all_once);
  }
  // ---- Poisson input -------------------------------------------------------------------------------------------
  {
    Network net({h, 5, 4});
    auto& a = net.add<models::Parrot>("a", 500);
    auto x = std::make_unique<PoissonInput>();
    x->target = &a;
    x->rate = 40;
    x->weight = 1;
    net.add_device(std::move(x));
    auto& r = net.record_spikes(a);
    net.run(2.0);
    // The parrot fires once per step with input, however many spikes: P(fire) = 1 - e^{-rate h}.
    const double p = -std::expm1(-40 * h), steps = 2.0 / h, mean = 500 * steps * p, sd = std::sqrt(500 * steps * p * (1 - p));
    s.check("network: Poisson input of 40 Hz, z of the count of steps with a spike", (static_cast<double>(r.spikes.size()) - mean) / sd, 5);
  }
  // ---- a uniform projection is the all-to-all one without its synapses ---------------------------------------
  {
    auto run = [&](bool uniform) {
      Network net({h, 9, 2});
      models::LifPscDelta::Params p;
      p.E_L = 0; p.V_reset = 0; p.V_th = 15 * u::mV; p.tau_m = 20 * u::ms;
      auto& a = net.add<models::LifPscDelta>("a", 200, p);
      const Connectivity c = uniform ? Connectivity::uniform(false) : Connectivity::all_to_all(false);
      net.connect(a, a, "delta", c, Distribution::constant(0.05 * u::mV), Distribution::constant(1 * u::ms));
      auto x = std::make_unique<PoissonInput>();
      x->target = &a;
      x->rate = 8000;  // a mean drive of 16 mV against a threshold of 15 mV
      x->weight = 0.1 * u::mV;
      net.add_device(std::move(x));
      auto& r = net.record_spikes(a);
      net.run(0.5);
      return std::pair{r.spikes, net.synapses()};
    };
    const auto [explicit_spikes, n1] = run(false);
    const auto [uniform_spikes, n2] = run(true);
    bool same = explicit_spikes.size() == uniform_spikes.size() && !explicit_spikes.empty();
    for (std::size_t i = 0; same && i < explicit_spikes.size(); i++) same &= explicit_spikes[i].time == uniform_spikes[i].time && explicit_spikes[i].gid == uniform_spikes[i].gid;
    s.require("network: a uniform projection gives the spikes of the explicit all-to-all one, without storing its synapses",
              same && n1 == n2 && n1 == 200 * 199, std::to_string(explicit_spikes.size()) + " spikes");
  }
  // ---- determinism across threads -------------------------------------------------------------------------------
  {
    const auto one = brunel(1), four = brunel(4), seven = brunel(7);
    auto equal = [](const Brunel& a, const Brunel& b) {
      if (a.spikes.size() != b.spikes.size() || a.synapses != b.synapses) return false;
      for (std::size_t i = 0; i < a.spikes.size(); i++) if (a.spikes[i].time != b.spikes[i].time || a.spikes[i].gid != b.spikes[i].gid) return false;
      return true;
    };
    s.require("network: a recurrent network gives the same spikes on 1, 4 and 7 threads", !one.spikes.empty() && equal(one, four) && equal(one, seven),
              std::to_string(one.spikes.size()) + " spikes, " + std::to_string(one.synapses) + " synapses");
    const auto other = brunel(4, 1000, 0.2, 13);
    s.require("network: another seed gives other spikes", !equal(one, other));
  }
  return s.done();
}
