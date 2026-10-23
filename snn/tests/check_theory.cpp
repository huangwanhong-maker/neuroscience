// Checks of the mean-field theory, and of simulations against it: Siegert's rate against its
// noiseless limit and against neurons driven by white noise; Brunel's sparse network in its
// asynchronous irregular state against the self-consistent rate; and a network of
// quadratic integrate-and-fire neurons against the exact mean field of Montbrió, Pazó and
// Roxin. These are the classical tests of a simulator of spiking networks: the theory and the
// simulation are independent, and each would expose an error in the other.

#include <neuroscience/snn/snn.hpp>
#include <calx/verification/check.hpp>

#include <cmath>
#include <numbers>
#include <string>

using namespace neuroscience::snn;
namespace u = physis::units::unit;
using calx::verification::relative;
using calx::verification::shortest;

int main() {
  calx::verification::Suite s;

  // ---- Siegert's formula ---------------------------------------------------------------------------------------
  {
    const double tau = 20e-3, rp = 2e-3, th = 20e-3, vr = 10e-3, mu = 25e-3;
    const double det = 1 / (rp + tau * std::log((mu - vr) / (mu - th)));
    s.check("theory: Siegert's rate tends to the deterministic rate as the noise vanishes", relative(theory::siegert(mu, 0.05e-3, tau, rp, th, vr), det), 1e-3);
  }
  // ---- neurons in white noise against Siegert ------------------------------------------------------------------------
  {
    // tau V' = -V + mu + sigma sqrt(tau) xi: a current I = mu C / tau and a noise current whose
    // standard deviation over a step h is sigma C / sqrt(tau h).
    const double h = 0.01e-3, tau = 20e-3, C = 250e-12, mu = 15e-3, sigma = 5e-3;
    models::LifPscDelta::Params p;
    p.C_m = C; p.tau_m = tau; p.t_ref = 2e-3; p.E_L = 0; p.V_reset = 10e-3; p.V_th = 20e-3;
    Network net({h, 21, 8});
    const std::size_t N = 4000;
    auto& pop = net.add<models::LifPscDelta>("n", N, p);
    auto dc = std::make_unique<CurrentInput>();
    dc->target = &pop;
    dc->amplitude = mu * C / tau;
    net.add_device(std::move(dc));
    auto nz = std::make_unique<NoiseInput>();
    nz->target = &pop;
    nz->sd = sigma * C / std::sqrt(tau * h);
    net.add_device(std::move(nz));
    net.run(0.2);
    auto& rec = net.record_spikes(pop);
    net.run(1.0);
    const double rate = static_cast<double>(rec.spikes.size()) / N / 1.0;
    const double want = theory::siegert(mu, sigma, tau, p.t_ref, p.V_th, p.V_reset);
    // Discrete steps miss threshold crossings between grid points, lowering the rate by a
    // relative amount of order sqrt(h / tau) = 2 % here (Brunel, Chance, Fourcaud and Abbott 2001).
    s.check("theory: neurons in white noise fire at Siegert's rate (relative error, 4000 neurons, h = 10 us)", relative(rate, want), 0.04);
    s.require("theory: and below it, as the missed crossings of a discrete grid make them", rate < want,
              shortest(rate) + " Hz against " + shortest(want) + " Hz");
  }
  // ---- Brunel's network, asynchronous irregular state, against its mean field ---------------------------------------
  {
    theory::Brunel b;
    b.C_E = 500;
    b.nu_ext = 2 * b.nu_thr();
    const double want = b.rate();
    Network net({0.1e-3, 33, 8});
    const std::size_t NE = 5000, NI = 1250, CE = 500, CI = 125;
    models::LifPscDelta::Params p;
    p.C_m = 250e-12; p.tau_m = b.tau; p.t_ref = b.tau_rp; p.E_L = 0; p.V_reset = b.V_r; p.V_th = b.theta;
    auto& E = net.add<models::LifPscDelta>("E", NE, p);
    auto& I = net.add<models::LifPscDelta>("I", NI, p);
    for (Population* t : {static_cast<Population*>(&E), static_cast<Population*>(&I)}) {
      net.connect(E, *t, "delta", Connectivity::fixed_indegree(CE, false), Distribution::constant(b.J), Distribution::constant(1.5e-3));
      net.connect(I, *t, "delta", Connectivity::fixed_indegree(CI, false), Distribution::constant(-b.g * b.J), Distribution::constant(1.5e-3));
      auto x = std::make_unique<PoissonInput>();
      x->target = t;
      x->rate = b.nu_ext * CE;
      x->weight = b.J;
      net.add_device(std::move(x));
    }
    net.initialise(E, 0, {Distribution::Kind::uniform, 0, b.theta});
    net.initialise(I, 0, {Distribution::Kind::uniform, 0, b.theta});
    net.run(0.3);
    auto& rE = net.record_spikes(E);
    net.run(1.0);
    const double rate = static_cast<double>(rE.spikes.size()) / NE;
    // The diffusion approximation neglects the shot noise of J = 0.1 mV against 10 mV and the
    // network's finite size; Brunel 2000 finds agreement within some percent.
    s.check("theory: Brunel's network (g = 5, eta = 2, C_E = 500) fires at its self-consistent rate (relative error)", relative(rate, want), 0.08);
    s.require("theory: the self-consistent rate of Brunel's network", want > 1 && want < 100, shortest(want) + " Hz, simulated " + shortest(rate) + " Hz");
  }
  // ---- quadratic integrate-and-fire neurons against Montbrió, Pazó and Roxin's mean field --------------------------
  {
    theory::Mpr m;
    m.tau = 10e-3; m.Delta = 1; m.J = 15; m.eta = -3;
    const auto roots = m.rates();
    s.require("theory: the MPR mean field has one stationary state here", roots.size() == 1, std::to_string(roots.size()) + " roots");
    const double want = roots.empty() ? 0 : roots[0];
    const double h = 0.02e-3;
    const std::size_t N = 4000;
    Network net({h, 5, 8});
    models::Qif::Params p;
    p.tau = m.tau; p.v_peak = 100; p.v_reset = -100; p.t_ref = 2 * m.tau / 100;
    auto& pop = net.add<models::Qif>("q", N, p);
    // Excitabilities at the quantiles of the Lorentzian: eta_j = eta + Delta tan(pi/2 (2j - N - 1)/(N + 1)).
    std::vector<double> eta(N);
    for (std::size_t j = 1; j <= N; j++) eta[j - 1] = m.eta + m.Delta * std::tan(std::numbers::pi / 2 * (2.0 * j - N - 1) / (N + 1));
    net.set_bias(pop, eta);
    // tau v' = ... + J tau s(t), s the population's spikes / N: each spike jumps every v by J / N.
    net.connect(pop, pop, "delta", Connectivity::uniform(true), Distribution::constant(m.J / N), Distribution::constant(h));
    net.run(0.2);
    auto& rec = net.record_spikes(pop);
    net.run(0.5);
    const double rate = static_cast<double>(rec.spikes.size()) / N / 0.5;
    s.check("theory: QIF neurons with Lorentzian excitabilities fire at MPR's stationary rate (relative error, 4000 neurons)", relative(rate, want), 0.03);
    s.require("theory: MPR's stationary rate", want > 0, shortest(want) + " Hz, simulated " + shortest(rate) + " Hz");
  }
  return s.done();
}
