// The mean-field theory of networks of spiking neurons, against which simulations are
// checked and with which they are understood.
//
// 1. The firing rate of a leaky integrate-and-fire neuron driven by white noise of mean mu
//    and standard deviation sigma (of the free membrane potential), with threshold theta,
//    reset V_r, membrane time tau and refractory period tau_rp (Siegert 1951; Ricciardi 1977;
//    Brunel 2000, J. Comput. Neurosci. 8, 183-208, eq. 21):
//      1 / nu = tau_rp + tau sqrt(pi) int_{(V_r - mu)/sigma}^{(theta - mu)/sigma} e^{u^2} (1 + erf u) du,
//    where e^{u^2} (1 + erf u) = erfcx(-u), finite where e^{u^2} alone overflows.
// 2. The stationary rate of Brunel's sparse network of excitatory and inhibitory neurons
//    (2000, eqs. 4-5): each neuron receives C_E excitatory synapses of weight J, C_I = gamma
//    C_E inhibitory ones of weight -g J, and C_E external ones at rate nu_ext, so that
//      mu = C_E J tau (nu_ext + nu (1 - g gamma)),  sigma^2 = J^2 C_E tau (nu_ext + nu (1 + g^2 gamma)),
//    and the rate nu is the fixed point nu = phi(mu(nu), sigma(nu)), found by Brent's method.
// 3. The exact mean field of quadratic integrate-and-fire neurons with Lorentzian
//    excitabilities of centre eta and half-width Delta, coupled all to all with strength J
//    (Montbrió, Pazó and Roxin 2015, Phys. Rev. X 5, 021028, eqs. 12-13):
//      tau r' = Delta / (pi tau) + 2 r v,   tau v' = v^2 + eta + J tau r - (pi tau r)^2 + I,
//    whose fixed points satisfy v = -Delta / (2 pi tau r) and
//      Delta^2 / (4 pi^2 tau^2 r^2) + eta + J tau r - pi^2 tau^2 r^2 = 0.

#pragma once

#include <cmath>
#include <numbers>
#include <stdexcept>
#include <vector>

#include <calx/quadrature/gauss_kronrod.hpp>
#include <calx/solvers/roots.hpp>
#include <calx/special_functions/erf.hpp>

namespace neuroscience::snn::theory {

// The rate (Hz) of the noise-driven leaky integrate-and-fire neuron. Quantities in SI units.
inline double siegert(double mu, double sigma, double tau, double tau_rp, double theta, double V_r) {
  if (!(sigma > 0)) {
    // Without noise: the deterministic period, if the mean reaches threshold.
    if (mu <= theta) return 0;
    return 1 / (tau_rp + tau * std::log((mu - V_r) / (mu - theta)));
  }
  const double lo = (V_r - mu) / sigma, hi = (theta - mu) / sigma;
  const auto I = calx::quadrature::integrate([](double u) { return calx::special_functions::erfcx(-u); }, lo, hi, 1e-13, 1e-12);
  return 1 / (tau_rp + tau * std::sqrt(std::numbers::pi) * I.value);
}

struct Brunel {
  double tau = 20e-3, tau_rp = 2e-3, theta = 20e-3, V_r = 10e-3;  // E_L = 0
  double J = 0.1e-3, g = 5, gamma = 0.25;
  double C_E = 1000, nu_ext = 0;                                    // nu_ext per external synapse (Hz)
  double mu(double nu) const { return C_E * J * tau * (nu_ext + nu * (1 - g * gamma)); }
  double sigma(double nu) const { return std::sqrt(J * J * C_E * tau * (nu_ext + nu * (1 + g * g * gamma))); }
  // The threshold rate: the external rate per synapse that brings the mean to threshold alone.
  double nu_thr() const { return theta / (J * C_E * tau); }
  // The self-consistent stationary rate (Hz).
  double rate() const {
    auto f = [&](double nu) { return siegert(mu(nu), sigma(nu), tau, tau_rp, theta, V_r) - nu; };
    const double top = 1 / tau_rp * (1 - 1e-9);
    if (f(0) <= 0) return 0;
    return calx::solvers::brent(f, 0, top, 1e-12).x;
  }
};

struct Mpr {
  double tau = 10e-3, eta = 0, Delta = 1, J = 15, I = 0;
  // The vector field of (r, v): r in Hz, v dimensionless.
  void field(double r, double v, double& dr, double& dv) const {
    dr = (Delta / (std::numbers::pi * tau) + 2 * r * v) / tau;
    dv = (v * v + eta + J * tau * r - std::pow(std::numbers::pi * tau * r, 2) + I) / tau;
  }
  // The stationary rates (Hz): the positive roots of the fixed-point equation, by a scan for
  // sign changes and Brent's method in each.
  std::vector<double> rates(double r_max = 1000) const {
    auto f = [&](double r) {
      const double x = std::numbers::pi * tau * r;
      return Delta * Delta / (4 * x * x) + eta + I + J * tau * r - x * x;
    };
    std::vector<double> out;
    const int n = 20000;
    double a = 1e-6, fa = f(a);
    for (int k = 1; k <= n; k++) {
      const double b = r_max * std::pow(static_cast<double>(k) / n, 2), fb = f(b);
      if (b <= a) continue;
      if ((fa > 0) != (fb > 0)) out.push_back(calx::solvers::brent(f, a, b, 1e-12).x);
      a = b;
      fa = fb;
    }
    return out;
  }
};

}  // namespace neuroscience::snn::theory
