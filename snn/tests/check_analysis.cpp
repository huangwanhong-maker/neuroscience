// Checks of the statistics of spike trains (analysis.hpp) on trains whose statistics are known:
// independent Poisson trains (CV, LV and Fano factors of 1, chi near 1 / sqrt(N), no
// correlation); clocks (CV, LV and Fano factors of 0); one train shared by every neuron (chi and
// correlation 1); trains whose rate oscillates (the spectrum's peak at the oscillation); and
// the engine's profile, whose phases account for its run.

#include <neuroscience/snn/snn.hpp>
#include <calx/verification/check.hpp>

#include <cmath>
#include <numbers>
#include <string>
#include <vector>

using namespace neuroscience::snn;
using calx::verification::shortest;

namespace {

// N independent Poisson trains of rate r(t) <= r_max over [0, T), by thinning.
template <class Rate>
analysis::Spikes poisson(std::size_t N, double T, double r_max, Rate r, std::uint32_t seed) {
  analysis::Spikes s;
  s.neurons = N;
  for (std::size_t i = 0; i < N; i++) {
    calx::random::Stream z(seed, static_cast<std::uint32_t>(i), 0, 0);
    for (double t = z.exponential() / r_max; t < T; t += z.exponential() / r_max)
      if (z.uniform() * r_max < r(t)) { s.times.push_back(t); s.senders.push_back(static_cast<std::uint32_t>(i)); }
  }
  return s;
}

}  // namespace

int main() {
  calx::verification::Suite s;
  {
    const std::size_t N = 200;
    const double T = 100, r = 20;
    const auto d = analysis::describe(poisson(N, T, r, [&](double) { return r; }, 3), {0, T});
    s.check("analysis: Poisson trains: their mean rate (relative)", d.rate_mean / r - 1, 0.01);
    s.check("analysis: Poisson trains: CV of their intervals, less 1", d.cv - 1, 0.01);
    s.check("analysis: Poisson trains: LV of their intervals, less 1", d.lv - 1, 0.01);
    s.check("analysis: Poisson trains: Fano factor of counts in 100 ms, less 1", d.fano - 1, 0.02);
    s.check("analysis: Poisson trains: chi against 1 / sqrt(N) (relative)", d.chi * std::sqrt(double(N)) - 1, 0.05);
    s.check("analysis: Poisson trains: mean correlation of counts over 400 pairs", d.correlation, 0.01);
    s.require("analysis: Poisson trains: every neuron fires, and is counted", d.active == N && d.irregular == N && d.fano_neurons == N);
  }
  {
    // Clocks of period 50 ms with phases of their own: every interval is 50 ms, and every
    // window of 100 ms holds two spikes.
    analysis::Spikes c;
    c.neurons = 50;
    for (std::uint32_t i = 0; i < 50; i++)
      for (int k = 0; k < 200; k++) { c.times.push_back(0.0005 + 0.0009 * i + 0.05 * k); c.senders.push_back(i); }
    const auto d = analysis::describe(c, {0, 10});
    s.check("analysis: clocks: CV of 0", d.cv, 1e-9);
    s.check("analysis: clocks: LV of 0", d.lv, 1e-9);
    s.check("analysis: clocks: Fano factor of 0", d.fano, 1e-12);
    s.check("analysis: clocks: their rate of 20 Hz", d.rate_mean - 20, 1e-9, "Hz");
  }
  {
    // One Poisson train shared by every neuron: perfect synchrony.
    const auto one = poisson(1, 50, 10, [](double) { return 10.0; }, 5);
    analysis::Spikes all;
    all.neurons = 40;
    for (std::uint32_t i = 0; i < 40; i++)
      for (double t : one.times) { all.times.push_back(t); all.senders.push_back(i); }
    const auto d = analysis::describe(all, {0, 50});
    s.check("analysis: a shared train: chi of 1", d.chi - 1, 1e-12);
    s.check("analysis: a shared train: correlation of 1", d.correlation - 1, 1e-12);
  }
  {
    // A rate oscillating at 40 Hz: the population's spectrum peaks there.
    const double f = 40, T = 20;
    const auto sp = poisson(400, T, 40, [&](double t) { return 20 * (1 + 0.8 * std::sin(2 * std::numbers::pi * f * t)); }, 7);
    const auto d = analysis::describe(sp, {0, T});
    const double df = d.spectrum.frequency.size() > 1 ? d.spectrum.frequency[1] : 1;
    s.check("analysis: a population oscillating at 40 Hz: the peak of its rate's spectrum (within one bin)", std::fabs(d.peak_frequency - f) / df, 1.0);
    s.require("analysis: its rate is binned at 1 ms over 20 s", d.rate.size() == 20000, std::to_string(d.rate.size()));
  }
  {
    // The engine's profile: Brunel's network for 0.2 s on four threads.
    Network net({0.1e-3, 3, 4});
    models::LifPscDelta::Params p;
    p.tau_m = 20e-3; p.t_ref = 2e-3; p.E_L = 0; p.V_reset = 10e-3; p.V_th = 20e-3;
    auto& E = net.add<models::LifPscDelta>("E", 4000, p);
    auto& I = net.add<models::LifPscDelta>("I", 1000, p);
    for (Population* t : {static_cast<Population*>(&E), static_cast<Population*>(&I)}) {
      net.connect(E, *t, "delta", Connectivity::fixed_indegree(400, false), Distribution::constant(0.1e-3), Distribution::constant(1.5e-3));
      net.connect(I, *t, "delta", Connectivity::fixed_indegree(100, false), Distribution::constant(-0.5e-3), Distribution::constant(1.5e-3));
      auto x = std::make_unique<PoissonInput>();
      x->target = t;
      x->rate = 2 * 20e-3 / (0.1e-3 * 400 * 20e-3) * 400;
      x->weight = 0.1e-3;
      net.add_device(std::move(x));
    }
    net.initialise(E, 0, {Distribution::Kind::uniform, 0, 20e-3});
    net.initialise(I, 0, {Distribution::Kind::uniform, 0, 20e-3});
    net.run(0.2);
    const auto& st = net.statistics();
    const auto& pr = st.profile;
    const double phases = pr.update + pr.exchange + pr.deliver + pr.record;
    s.check("analysis: the profile's phases account for the run's wall time (relative)", phases / st.wall - 1, 0.05);
    bool within = pr.update_busy.size() == 4;
    for (std::size_t t = 0; within && t < 4; t++) within = pr.update_busy[t] <= pr.update * 1.0001 && pr.deliver_busy[t] <= pr.deliver * 1.0001;
    s.require("analysis: no thread is busier than its phase is long", within);
    s.require("analysis: one window per shortest delay", pr.windows == static_cast<std::uint64_t>(std::llround(0.2 / 1.5e-3 + 0.4999)), std::to_string(pr.windows) + " windows");
  }
  return s.done();
}
