// Models of excitability: how a neuron passes from rest to repetitive firing.
//
// Hodgkin (1948) sorted axons by their response to steady currents: in class 1 the firing
// begins at an arbitrarily low rate, which grows continuously with the current; in class 2 it
// begins at a rate bounded away from zero. Rinzel and Ermentrout (1989, 1998) traced the
// classes to the bifurcation in which the resting state is lost: in class 1 it meets a saddle
// and disappears on an invariant circle (a SNIC), and the period diverges as (I - I_c)^{-1/2};
// in class 2 it loses its stability in a Hopf bifurcation, and the oscillation appears with a
// finite period. The models here are the standard examples:
//
// - wang_buzsaki:    a fast-spiking interneuron of the hippocampus, class 1 (Wang and
//                    Buzsáki 1996);
// - morris_lecar:    the barnacle giant muscle fibre, a planar conductance model, class 2
//                    with Rinzel and Ermentrout's Hopf parameters (the defaults) and class 1
//                    with their SNIC parameters (Morris and Lecar 1981);
// - fitzhugh_nagumo: the planar caricature of Hodgkin and Huxley's model, in normalised
//                    units, class 2 (FitzHugh 1961; Nagumo, Arimoto and Yoshizawa 1962).
//
// Their spikes are broad, or not cut short by a reset, so a spike is the upward crossing of
// V_spike, counted once: the component `armed` is cleared at the spike and set again by
// settle() once the potential has fallen below V_rearm. Each starts at its resting state for
// its constant current I_e, the lowest equilibrium of its steady-state current.
// Conductances are given per patch of 1e-4 cm^2 (1 uF/cm^2 is 100 pF, 1 mS/cm^2 is 100 nS,
// 1 uA/cm^2 is 100 pA); rates written per millisecond are converted to per second.

#pragma once

#include <array>
#include <cmath>
#include <stdexcept>

#include <calx/solvers/roots.hpp>

#include "../model.hpp"

namespace neuroscience::snn::models {

using pd::Method;

// The lowest zero of f on [lo, hi], scanned in `steps` intervals and refined by Brent's
// method: the resting state of a membrane whose steady-state current is N-shaped, and so
// has up to three equilibria, is the lowest.
template <class F>
double lowest_zero(F&& f, double lo, double hi, int steps) {
  double a = lo, fa = f(a);
  for (int i = 1; i <= steps; i++) {
    const double b = lo + (hi - lo) * i / steps, fb = f(b);
    if ((fa > 0) != (fb > 0)) return calx::solvers::brent(f, a, b, 0).x;
    a = b;
    fa = fb;
  }
  throw std::domain_error("no equilibrium between the bounds scanned");
}

// ---- wang_buzsaki -------------------------------------------------------------------------------------
// C V' = -g_Na m_inf^3 h (V - E_Na) - g_K n^4 (V - E_K) - g_L (V - E_L) + I, with the sodium
// activation instantaneous, m = m_inf(V) = alpha_m / (alpha_m + beta_m), and the gates
// x' = phi (alpha_x (1 - x) - beta_x x), phi = 5 (Wang and Buzsáki 1996), per ms with
// V in mV:
//   alpha_m = 0.1 (V + 35) / (1 - exp(-0.1 (V + 35))),   beta_m = 4 exp(-(V + 60) / 18),
//   alpha_h = 0.07 exp(-(V + 58) / 20),                  beta_h = 1 / (1 + exp(-0.1 (V + 28))),
//   alpha_n = 0.01 (V + 34) / (1 - exp(-0.1 (V + 34))),  beta_n = 0.125 exp(-(V + 44) / 80);
// per cm^2, C = 1 uF, g_Na = 35, g_K = 9, g_L = 0.1 mS; E_Na = 55, E_K = -90, E_L = -65 mV.
// The paper's synapses are GABA_A conductances decaying in 10 ms; here they are currents.
struct WangBuzsaki {
  static constexpr std::string_view name = "wang_buzsaki";
  static constexpr std::string_view summary = "Wang and Buzsáki's fast-spiking interneuron: Hodgkin-Huxley currents with instantaneous sodium activation, firing from an arbitrarily low rate (class 1) up to hundreds of hertz.";
  static constexpr std::string_view citation = "Wang and Buzsáki 1996, J. Neurosci. 16, 6402-6413";
  static constexpr std::size_t n = 6;
  struct Params {
    double C_m = 100 * unit::pF, g_Na = 3500 * unit::nS, g_K = 900 * unit::nS, g_L = 10 * unit::nS;
    double E_Na = 55 * unit::mV, E_K = -90 * unit::mV, E_L = -65 * unit::mV, phi = 5;
    double V_spike = -20 * unit::mV, V_rearm = -40 * unit::mV, tau_syn_ex = 2 * unit::ms, tau_syn_in = 10 * unit::ms, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 13> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"g_Na", &Params::g_Na, dim::conductance, "peak sodium conductance"},
      {"g_K", &Params::g_K, dim::conductance, "peak potassium conductance"},
      {"g_L", &Params::g_L, dim::conductance, "leak conductance"},
      {"E_Na", &Params::E_Na, dim::voltage, "sodium reversal potential"},
      {"E_K", &Params::E_K, dim::voltage, "potassium reversal potential"},
      {"E_L", &Params::E_L, dim::voltage, "leak reversal potential"},
      {"phi", &Params::phi, dim::one, "speed of the gates h and n, relative to Hodgkin and Huxley's"},
      {"V_spike", &Params::V_spike, dim::voltage, "the potential whose upward crossing is a spike"},
      {"V_rearm", &Params::V_rearm, dim::voltage, "the potential below which the next crossing counts"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"h", dim::one, "sodium inactivation"}, {"n", dim::one, "potassium activation"},
      {"I_ex", dim::current, "excitatory synaptic current"}, {"I_in", dim::current, "inhibitory synaptic current"},
      {"armed", dim::one, "1 while the next crossing of V_spike counts as a spike"}}};
  static constexpr std::array<double, n> scale{1e-3, 1, 1, 1e-10, 1e-10, 1};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 3, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 4, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{false, false, false, false, false, false};
  static constexpr std::array<bool, n> gate{false, true, true, false, false, false};
  static constexpr Method method = Method::dopri5;

  // The rates at V (volts), per second, before phi: {alpha_m, beta_m, alpha_h, beta_h, alpha_n, beta_n}.
  static std::array<double, 6> rates(double V) {
    const double v = V * 1e3;
    return {1e3 * exprel(0.1 * (v + 35)), 1e3 * 4 * std::exp(-(v + 60) / 18),
            1e3 * 0.07 * std::exp(-(v + 58) / 20), 1e3 / (1 + std::exp(-0.1 * (v + 28))),
            1e3 * 0.1 * exprel(0.1 * (v + 34)), 1e3 * 0.125 * std::exp(-(v + 44) / 80)};
  }
  // The membrane current at V with gates h and n (positive outward), without synapses or input.
  static double ionic(const Params& p, double V, double h, double k) {
    const auto r = rates(V);
    const double m = r[0] / (r[0] + r[1]);
    return p.g_Na * m * m * m * h * (V - p.E_Na) + p.g_K * k * k * k * k * (V - p.E_K) + p.g_L * (V - p.E_L);
  }
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    const auto r = rates(x[0]);
    dx[0] = (-ionic(p, x[0], x[1], x[2]) + x[3] + x[4] + p.I_e + u) / p.C_m;
    dx[1] = p.phi * (r[2] * (1 - x[1]) - r[3] * x[1]);
    dx[2] = p.phi * (r[4] * (1 - x[2]) - r[5] * x[2]);
    dx[3] = -x[3] / p.tau_syn_ex;
    dx[4] = -x[4] / p.tau_syn_in;
    dx[5] = 0;
  }
  static void gates(const Params& p, const State<n>& x, State<n>& inf, State<n>& tau) {
    const auto r = rates(x[0]);
    for (int g = 0; g < 2; g++) {
      const double s = r[2 + 2 * g] + r[3 + 2 * g];
      inf[1 + g] = r[2 + 2 * g] / s;
      tau[1 + g] = 1 / (p.phi * s);
    }
  }
  static bool guard(const Params& p, const State<n>& x) { return x[5] > 0.5 && x[0] >= p.V_spike; }
  static void jump(const Params&, State<n>& x) { x[5] = 0; }
  static void settle(const Params& p, State<n>& x) { if (x[0] < p.V_rearm) x[5] = 1; }
  static double dwell(const Params&) { return 0; }
  static State<n> initial(const Params& p) {
    auto steady = [&](double V) {
      const auto r = rates(V);
      return std::array<double, 2>{r[2] / (r[2] + r[3]), r[4] / (r[4] + r[5])};
    };
    const double V = lowest_zero([&](double v) { const auto g = steady(v); return p.I_e - ionic(p, v, g[0], g[1]); }, -100e-3, 50e-3, 300);
    const auto g = steady(V);
    return {V, g[0], g[1], 0, 0, 1};
  }
};

// ---- morris_lecar -------------------------------------------------------------------------------------
// C V' = -g_L (V - E_L) - g_Ca m_inf(V) (V - E_Ca) - g_K w (V - E_K) + I,
// w' = phi cosh((V - V_3) / (2 V_4)) (w_inf(V) - w),
// m_inf = (1 + tanh((V - V_1) / V_2)) / 2,  w_inf = (1 + tanh((V - V_3) / V_4)) / 2
// (Morris and Lecar 1981, in their planar form, the calcium activation instantaneous). Per cm^2, C = 20 uF, g_L = 2, g_K = 8 mS; E_L = -60, E_Ca = 120, E_K = -84 mV,
// V_1 = -1.2, V_2 = 18 mV; and either
//   Hopf (class 2, the defaults): g_Ca = 4.4 mS, V_3 = 2, V_4 = 30 mV, phi = 0.04/ms;
//   SNIC (class 1):               g_Ca = 4 mS,   V_3 = 12, V_4 = 17.4 mV, phi = 1/15 per ms.
struct MorrisLecar {
  static constexpr std::string_view name = "morris_lecar";
  static constexpr std::string_view summary = "Morris and Lecar's barnacle muscle fibre: calcium and potassium conductances in a planar model; class 2 with Rinzel and Ermentrout's Hopf parameters (the defaults), class 1 with their SNIC parameters.";
  static constexpr std::string_view citation =
      "Morris and Lecar 1981, Biophys. J. 35, 193-213; Rinzel and Ermentrout 1998, in Koch and Segev (eds.), Methods in Neuronal Modeling, 2nd ed., MIT Press, 251-292";
  static constexpr std::size_t n = 5;
  struct Params {
    double C_m = 2 * unit::nF, g_L = 200 * unit::nS, g_Ca = 440 * unit::nS, g_K = 800 * unit::nS;
    double E_L = -60 * unit::mV, E_Ca = 120 * unit::mV, E_K = -84 * unit::mV;
    double V_1 = -1.2 * unit::mV, V_2 = 18 * unit::mV, V_3 = 2 * unit::mV, V_4 = 30 * unit::mV, phi = 40.0;
    double V_spike = 0 * unit::mV, V_rearm = -20 * unit::mV, tau_syn_ex = 2 * unit::ms, tau_syn_in = 2 * unit::ms, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 17> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"g_L", &Params::g_L, dim::conductance, "leak conductance"},
      {"g_Ca", &Params::g_Ca, dim::conductance, "peak calcium conductance"},
      {"g_K", &Params::g_K, dim::conductance, "peak potassium conductance"},
      {"E_L", &Params::E_L, dim::voltage, "leak reversal potential"},
      {"E_Ca", &Params::E_Ca, dim::voltage, "calcium reversal potential"},
      {"E_K", &Params::E_K, dim::voltage, "potassium reversal potential"},
      {"V_1", &Params::V_1, dim::voltage, "half-activation of the calcium current"},
      {"V_2", &Params::V_2, dim::voltage, "slope of the calcium activation"},
      {"V_3", &Params::V_3, dim::voltage, "half-activation of the potassium current"},
      {"V_4", &Params::V_4, dim::voltage, "slope of the potassium activation"},
      {"phi", &Params::phi, dim::frequency, "rate of the potassium activation"},
      {"V_spike", &Params::V_spike, dim::voltage, "the potential whose upward crossing is a spike"},
      {"V_rearm", &Params::V_rearm, dim::voltage, "the potential below which the next crossing counts"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"w", dim::one, "potassium activation"},
      {"I_ex", dim::current, "excitatory synaptic current"}, {"I_in", dim::current, "inhibitory synaptic current"},
      {"armed", dim::one, "1 while the next crossing of V_spike counts as a spike"}}};
  static constexpr std::array<double, n> scale{1e-3, 1, 1e-9, 1e-9, 1};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-9;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 2, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 3, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{false, false, false, false, false};
  static constexpr std::array<bool, n> gate{false, true, false, false, false};
  static constexpr Method method = Method::dopri5;

  static double m_inf(const Params& p, double V) { return 0.5 * (1 + std::tanh((V - p.V_1) / p.V_2)); }
  static double w_inf(const Params& p, double V) { return 0.5 * (1 + std::tanh((V - p.V_3) / p.V_4)); }
  static double w_rate(const Params& p, double V) { return p.phi * std::cosh((V - p.V_3) / (2 * p.V_4)); }
  static double ionic(const Params& p, double V, double w) {
    return p.g_L * (V - p.E_L) + p.g_Ca * m_inf(p, V) * (V - p.E_Ca) + p.g_K * w * (V - p.E_K);
  }
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    dx[0] = (-ionic(p, x[0], x[1]) + x[2] + x[3] + p.I_e + u) / p.C_m;
    dx[1] = w_rate(p, x[0]) * (w_inf(p, x[0]) - x[1]);
    dx[2] = -x[2] / p.tau_syn_ex;
    dx[3] = -x[3] / p.tau_syn_in;
    dx[4] = 0;
  }
  static void gates(const Params& p, const State<n>& x, State<n>& inf, State<n>& tau) {
    inf[1] = w_inf(p, x[0]);
    tau[1] = 1 / w_rate(p, x[0]);
  }
  static bool guard(const Params& p, const State<n>& x) { return x[4] > 0.5 && x[0] >= p.V_spike; }
  static void jump(const Params&, State<n>& x) { x[4] = 0; }
  static void settle(const Params& p, State<n>& x) { if (x[0] < p.V_rearm) x[4] = 1; }
  static double dwell(const Params&) { return 0; }
  static State<n> initial(const Params& p) {
    const double V = lowest_zero([&](double v) { return p.I_e - ionic(p, v, w_inf(p, v)); }, -100e-3, 100e-3, 400);
    return {V, w_inf(p, V), 0, 0, 1};
  }
};

// ---- fitzhugh_nagumo ----------------------------------------------------------------------------------
// tau v' = v - v^3 / 3 - w + I,  tau w' = epsilon (v + a - b w), in normalised units, with
// FitzHugh's (1961) a = 0.7 and b = 0.8, and epsilon = 0.08 (1 / 12.5 in Izhikevich and FitzHugh
// 2006); tau is the unit of time. The resting state (v*, w*) loses stability where
// the trace of the Jacobian, 1 - v*^2 - epsilon b, vanishes while its determinant,
// epsilon (1 - b (1 - v*^2)), is positive: a Hopf bifurcation at v* = -sqrt(1 - epsilon b),
// I_H = (v* + a) / b - v* + v*^3 / 3 (0.3313 for these parameters).
struct FitzhughNagumo {
  static constexpr std::string_view name = "fitzhugh_nagumo";
  static constexpr std::string_view summary = "The FitzHugh-Nagumo model: a cubic fast variable and a linear recovery, the planar caricature of the Hodgkin-Huxley neuron, in normalised units.";
  static constexpr std::string_view citation =
      "FitzHugh 1961, Biophys. J. 1, 445-466; Nagumo, Arimoto and Yoshizawa 1962, Proc. IRE 50, 2061-2070; Izhikevich and FitzHugh 2006, Scholarpedia 1(9), 1349";
  static constexpr std::size_t n = 3;
  struct Params {
    double tau = 1 * unit::ms, a = 0.7, b = 0.8, epsilon = 0.08, v_spike = 1, v_rearm = 0, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 7> parameters{{
      {"tau", &Params::tau, dim::time, "the unit of time"},
      {"a", &Params::a, dim::one, "offset of the recovery's nullcline"},
      {"b", &Params::b, dim::one, "slope of the recovery's nullcline"},
      {"epsilon", &Params::epsilon, dim::one, "ratio of the recovery's speed to the potential's"},
      {"v_spike", &Params::v_spike, dim::one, "the value of v whose upward crossing is a spike"},
      {"v_rearm", &Params::v_rearm, dim::one, "the value below which the next crossing counts"},
      {"I_e", &Params::I_e, dim::one, "constant external input"},
  }};
  static constexpr std::array<Component, n> components{{
      {"v", dim::one, "the fast, excitable variable"}, {"w", dim::one, "the slow recovery"},
      {"armed", dim::one, "1 while the next crossing of v_spike counts as a spike"}}};
  static constexpr std::array<double, n> scale{1, 1, 1};
  static constexpr Dimension input = dim::one;
  static constexpr double input_scale = 1.0;
  static constexpr std::array<Receptor, 1> receptors{{{"delta", 0, "a jump of v (dimensionless)"}}};
  static constexpr std::array<bool, n> held{false, false, false};
  static constexpr Method method = Method::dopri5;
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    dx[0] = (x[0] - x[0] * x[0] * x[0] / 3 - x[1] + p.I_e + u) / p.tau;
    dx[1] = p.epsilon * (x[0] + p.a - p.b * x[1]) / p.tau;
    dx[2] = 0;
  }
  static bool guard(const Params& p, const State<n>& x) { return x[2] > 0.5 && x[0] >= p.v_spike; }
  static void jump(const Params&, State<n>& x) { x[2] = 0; }
  static void settle(const Params& p, State<n>& x) { if (x[0] < p.v_rearm) x[2] = 1; }
  static double dwell(const Params&) { return 0; }
  static State<n> initial(const Params& p) {
    const double v = lowest_zero([&](double v) { return v - v * v * v / 3 - (v + p.a) / p.b + p.I_e; }, -3, 3, 600);
    return {v, (v + p.a) / p.b, 1};
  }
};

}  // namespace neuroscience::snn::models
