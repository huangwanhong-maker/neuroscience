// Checks of the quantum neurons as populations of the network: the photons of a driven emitter
// against the closed form of its waiting time, exact on the grid; their rate against the
// master equation's; the average of the trajectories against the master equation's density
// matrix; and pulses, which rotate the state as they should.
//
// On resonance (Delta = 0), from |g>, with Omega' = sqrt(Omega^2 - gamma^2 / 4), the probability
// that no photon has been emitted by t is (Plenio and Knight 1998, §III)
//   S(t) = e^{-gamma t / 2} ((cos(Omega' t / 2) + gamma / (2 Omega') sin(Omega' t / 2))^2
//                            + (Omega / Omega')^2 sin^2(Omega' t / 2)).

#include <neuroscience/snn/snn.hpp>
#include <calx/verification/check.hpp>

#include <algorithm>
#include <cmath>
#include <numbers>
#include <string>
#include <vector>

using namespace neuroscience::snn;
using calx::verification::shortest;
namespace pq = physis::quantum;
using M = models::QuantumEmitter;

namespace {

double survival(const M::Params& p, double t) {
  const double W = std::sqrt(p.Omega * p.Omega - p.gamma * p.gamma / 4), a = W * t / 2;
  const double g = std::cos(a) + p.gamma / (2 * W) * std::sin(a), e = p.Omega / W * std::sin(a);
  return std::exp(-p.gamma * t / 2) * (g * g + e * e);
}

// The Kolmogorov-Smirnov distance between the first spike times of n neurons (time indices,
// -1 for none) and the distribution F(j) of the first spike's time index.
template <class F>
double ks(const std::vector<Step>& first, std::size_t steps, F&& cdf) {
  std::vector<std::size_t> count(steps + 2, 0);
  for (Step j : first)
    if (j >= 0) count[static_cast<std::size_t>(j)]++;
  double worst = 0, seen = 0;
  for (std::size_t j = 0; j <= steps; j++) {
    seen += count[j];
    worst = std::max(worst, std::fabs(seen / first.size() - cdf(j)));
  }
  return worst;
}

}  // namespace

int main() {
  calx::verification::Suite s;
  const double h = 0.1e-3;
  const M::Params p;  // Omega = 400 rad/s, gamma = 100/s, on resonance
  const std::size_t N = 20000;

  // ---- the first photon: its distribution is exact on the grid ------------------------------------------------------
  {
    const double T = 0.15;
    Network net({h, 3, 4});
    auto& pop = net.add<M>("emitters", N, p);
    auto& rec = net.record_spikes(pop);
    net.run(T);
    std::vector<Step> first(N, -1);
    for (const auto& sp : rec.spikes)
      if (first[sp.gid] < 0) first[sp.gid] = sp.time;
    const std::size_t steps = static_cast<std::size_t>(std::llround(T / h));
    const double D = ks(first, steps, [&](std::size_t j) { return 1 - survival(p, j * h); });
    s.check("quantum: the first photons of 20,000 emitters against the closed-form waiting time (Kolmogorov-Smirnov, sqrt(N) D)", std::sqrt(double(N)) * D, 2.0);
  }
  // ---- the rate of photons: the grid's exact mean interval, and the master equation's rate ---------------------------
  {
    // On the grid an interval of j steps has probability S((j - 1) h) - S(j h), so the mean
    // interval is h sum_{j >= 0} S(j h) = 1 / R + h / 2 + O(h^4) (Euler and Maclaurin, S'(0) = 0),
    // R = gamma rho_ee the master equation's rate of emission.
    double mean = 0;
    for (std::size_t j = 0; j < 200000; j++) mean += survival(p, j * h) * h;
    const double R = pq::emission_rate({p.Omega, p.Delta, p.gamma, 0});
    s.check("quantum: the grid's mean interval against 1 / R + h / 2, R the master equation's emission rate (relative)", (mean - (1 / R + h / 2)) * R, 1e-9);
    const double T = 0.4, from = 0.2;
    Network net({h, 5, 4});
    auto& pop = net.add<M>("emitters", 4000, p);
    auto& rec = net.record_spikes(pop);
    net.run(T);
    const double count = static_cast<double>(std::count_if(rec.spikes.begin(), rec.spikes.end(), [&](const Spike& x) { return x.time * h > from; }));
    const double expected = 4000 * (T - from) / mean;
    s.check("quantum: the stationary rate of 4,000 emitters against the inverse mean interval (z, Poisson bound)", (count - expected) / std::sqrt(expected), 5);
    s.require("quantum: the stationary rate", count > 0, shortest(count / (4000 * (T - from))) + " /s; the master equation's " + shortest(R) + " /s");
  }
  // ---- the average of the trajectories is the master equation's density matrix ----------------------------------------
  {
    // Each detection is placed at the end of its step, which delays the trajectory by less than
    // h; at a quarter of the step that shift is well below the statistical error.
    const double T = 0.1, hq = h / 4;
    const std::int64_t every = 200;
    Network net({hq, 9, 4});
    auto& pop = net.add<M>("emitters", N, p);
    std::vector<std::size_t> all(N);
    for (std::size_t i = 0; i < N; i++) all[i] = i;
    auto& rec = net.record_state(pop, all, {2, 3}, every);
    net.run(T);
    const auto P = pd::linear_propagator<pq::Bloch>({p.Omega, p.Delta, p.gamma, 0}, every * hq);
    pd::State<3> r{0, 0, -1};
    double worst = 0;
    for (std::size_t k = 0; k < rec.times.size(); k++) {
      double sum = 0, sum2 = 0;
      for (std::size_t i = 0; i < N; i++) {
        const double pe = rec.values[i][2 * k] * rec.values[i][2 * k] + rec.values[i][2 * k + 1] * rec.values[i][2 * k + 1];
        sum += pe;
        sum2 += pe * pe;
      }
      const double m = sum / N, sd = std::sqrt(std::max(sum2 / N - m * m, 1e-12));
      if (k > 0) worst = std::max(worst, std::fabs(m - pq::excited(r)) / (sd / std::sqrt(double(N))));
      P.apply(r, 0.0);
    }
    s.check("quantum: the average excited population of 20,000 trajectories against the master equation, every 5 ms (largest z)", worst, 5);
  }
  // ---- pulses: pi excites, and the photon follows at the rate gamma; 2 pi returns to |g> ---------------------------------
  {
    M::Params dark = p;
    dark.Omega = 0;
    auto run = [&](double theta) {
      Network net({h, 13, 4});
      auto& pop = net.add<M>("emitters", N, dark);
      auto pulse = std::make_unique<SpikeTimes>();
      pulse->target = &pop;
      pulse->receptor = pop.receptor("pulse");
      pulse->weight = theta;
      pulse->times = {10};
      net.add_device(std::move(pulse));
      auto& rec = net.record_spikes(pop);
      net.run(0.1);
      return rec.spikes;
    };
    const auto pi = run(std::numbers::pi), two_pi = run(2 * std::numbers::pi);
    std::vector<Step> first(N, -1);
    for (const auto& sp : pi)
      if (first[sp.gid] < 0) first[sp.gid] = sp.time;
    const double D = ks(first, 1000, [&](std::size_t j) { return j <= 10 ? 0.0 : 1 - std::exp(-dark.gamma * (j - 10.0) * h); });
    s.check("quantum: after a pi pulse, the first photon is exponential at the rate gamma (Kolmogorov-Smirnov, sqrt(N) D)", std::sqrt(double(N)) * D, 2.0);
    s.require("quantum: each emitter gives one photon after a pi pulse, without a drive", pi.size() == N - static_cast<std::size_t>(std::count(first.begin(), first.end(), -1)),
              std::to_string(pi.size()) + " photons");
    s.require("quantum: a 2 pi pulse returns every emitter to |g>: no photon", two_pi.empty(), std::to_string(two_pi.size()) + " photons");
  }
  return s.done();
}
