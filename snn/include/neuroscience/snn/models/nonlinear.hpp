// Neurons whose flow is not linear, and two that are linear in other coordinates.
//
// - lif_cond_exp:   conductance-based leaky integrate-and-fire neuron, exponentially decaying
//                   conductances (Kuhn, Aertsen and Rotter 2004; NEST iaf_cond_exp).
// - adex:           the adaptive exponential integrate-and-fire neuron (Brette and Gerstner
//                   2005), with exponentially decaying synaptic currents.
// - izhikevich:     Izhikevich's simple model (2003), in SI units.
// - izhikevich_2007: the same model in physical units, with a capacitance and a recovery
//                  current, as Izhikevich's book (2007) fits it to cortical cells.
// - hodgkin_huxley: the squid axon (Hodgkin and Huxley 1952) as NEST's hh_psc_alpha states
//                   it for a patch of 100 pF, with exponentially decaying synaptic currents.
// - qif:            the quadratic integrate-and-fire neuron in normalised units,
//                   tau v' = v^2 + eta + I, integrated by its exact flow (Ermentrout and Kopell
//                   1986; Montbrió, Pazó and Roxin 2015).
// - resonate_and_fire: a damped linear oscillator that fires when its second coordinate
//                   crosses a threshold (Izhikevich 2001), as neuromorphic hardware uses it.
// - brf:            the balanced resonate-and-fire neuron (Higuchi et al. 2024): the same
//                   oscillator without a reset, its refractoriness raising the threshold and
//                   deepening the damping; advanced by its exact flow.
//
// Rates written in the literature per millisecond are converted to per second.

#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <complex>
#include <limits>
#include <numbers>

#include "../model.hpp"

namespace neuroscience::snn::models {

using pd::Method;

// ---- lif_cond_exp -----------------------------------------------------------------------------------
struct LifCondExp {
  static constexpr std::string_view name = "lif_cond_exp";
  static constexpr std::string_view summary = "Conductance-based leaky integrate-and-fire neuron with exponentially decaying excitatory and inhibitory conductances.";
  static constexpr std::string_view citation = "Kuhn, Aertsen and Rotter 2004, J. Neurosci. 24, 2345-2356; NEST iaf_cond_exp";
  static constexpr std::size_t n = 3;
  struct Params {
    double C_m = 250 * unit::pF, g_L = 16.6667 * unit::nS, E_L = -70 * unit::mV, E_ex = 0 * unit::mV, E_in = -85 * unit::mV;
    double V_th = -55 * unit::mV, V_reset = -60 * unit::mV, t_ref = 2 * unit::ms;
    double tau_syn_ex = 0.2 * unit::ms, tau_syn_in = 2 * unit::ms, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 11> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"g_L", &Params::g_L, dim::conductance, "leak conductance"},
      {"E_L", &Params::E_L, dim::voltage, "leak reversal potential"},
      {"E_ex", &Params::E_ex, dim::voltage, "excitatory reversal potential"},
      {"E_in", &Params::E_in, dim::voltage, "inhibitory reversal potential"},
      {"V_th", &Params::V_th, dim::voltage, "threshold"},
      {"V_reset", &Params::V_reset, dim::voltage, "reset potential"},
      {"t_ref", &Params::t_ref, dim::time, "refractory period"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory conductance"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory conductance"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"g_ex", dim::conductance, "excitatory conductance"}, {"g_in", dim::conductance, "inhibitory conductance"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-9, 1e-9};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 1, "a jump of the excitatory conductance (S, positive)"}, {"inhibitory", 2, "a jump of the inhibitory conductance (S, positive)"}}};
  static constexpr std::array<bool, n> held{true, false, false};
  static constexpr Method method = Method::dopri5;
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    dx[0] = (-p.g_L * (x[0] - p.E_L) - x[1] * (x[0] - p.E_ex) - x[2] * (x[0] - p.E_in) + p.I_e + u) / p.C_m;
    dx[1] = -x[1] / p.tau_syn_ex;
    dx[2] = -x[2] / p.tau_syn_in;
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_th; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.V_reset; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L, 0, 0}; }
};

// ---- adex -------------------------------------------------------------------------------------------
// C V' = -g_L (V - E_L) + g_L Delta_T exp((V - V_T) / Delta_T) - w + I,  tau_w w' = a (V - E_L) - w;
// at V >= V_peak: V <- V_reset, w <- w + b. Every term is evaluated at min(V, V_peak), as NEST's
// aeif models do: within a step the potential may overshoot the peak before the guard is
// tested at the step's end, and neither the exponential nor the adaptation may follow it.
struct Adex {
  static constexpr std::string_view name = "adex";
  static constexpr std::string_view summary = "Adaptive exponential integrate-and-fire neuron: an exponential spike initiation and a spike-triggered, subthreshold adaptation current.";
  static constexpr std::string_view citation = "Brette and Gerstner 2005, J. Neurophysiol. 94, 3637-3642; Naud et al. 2008, Biol. Cybern. 99, 335-347";
  static constexpr std::size_t n = 4;
  struct Params {
    double C_m = 281 * unit::pF, g_L = 30 * unit::nS, E_L = -70.6 * unit::mV, V_T = -50.4 * unit::mV, Delta_T = 2 * unit::mV;
    double tau_w = 144 * unit::ms, a = 4 * unit::nS, b = 80.5 * unit::pA, V_reset = -70.6 * unit::mV, V_peak = 0 * unit::mV;
    double t_ref = 0, tau_syn_ex = 0.2 * unit::ms, tau_syn_in = 2 * unit::ms, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 14> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"g_L", &Params::g_L, dim::conductance, "leak conductance"},
      {"E_L", &Params::E_L, dim::voltage, "leak reversal potential"},
      {"V_T", &Params::V_T, dim::voltage, "threshold of the exponential spike initiation"},
      {"Delta_T", &Params::Delta_T, dim::voltage, "slope factor of the spike initiation"},
      {"tau_w", &Params::tau_w, dim::time, "time constant of the adaptation current"},
      {"a", &Params::a, dim::conductance, "subthreshold adaptation"},
      {"b", &Params::b, dim::current, "spike-triggered adaptation"},
      {"V_reset", &Params::V_reset, dim::voltage, "reset potential"},
      {"V_peak", &Params::V_peak, dim::voltage, "the potential at which the spike is cut and reset"},
      {"t_ref", &Params::t_ref, dim::time, "refractory period"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"w", dim::current, "adaptation current"},
      {"I_ex", dim::current, "excitatory synaptic current"}, {"I_in", dim::current, "inhibitory synaptic current"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-10, 1e-10, 1e-10};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 2, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 3, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{true, false, false, false};
  static constexpr Method method = Method::dopri5;
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    const double V = std::min(x[0], p.V_peak);
    const double spike = p.Delta_T > 0 ? p.g_L * p.Delta_T * std::exp((V - p.V_T) / p.Delta_T) : 0;
    dx[0] = (-p.g_L * (V - p.E_L) + spike - x[1] + x[2] + x[3] + p.I_e + u) / p.C_m;
    dx[1] = (p.a * (V - p.E_L) - x[1]) / p.tau_w;
    dx[2] = -x[2] / p.tau_syn_ex;
    dx[3] = -x[3] / p.tau_syn_in;
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_peak; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.V_reset; x[1] += p.b; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L, 0, 0, 0}; }
};

// ---- izhikevich ----------------------------------------------------------------------------------------
// v' = 0.04 v^2 + 5 v + 140 - u + I, u' = a (b v - u), in mV and ms; at v >= 30 mV: v <- c,
// u <- u + d. Since 1 mV/ms = 1 V/s, the right-hand side in mV/ms is dV/dt in V/s; u is in
// V/s; a and b, per ms in the paper, are per second here (0.02/ms = 20/s); d, in mV/ms, is
// in V/s. The input current enters as I / C_m, so that with C_m = 1 pF a current of 10 pA
// is Izhikevich's I = 10.
struct Izhikevich {
  static constexpr std::string_view name = "izhikevich";
  static constexpr std::string_view summary = "Izhikevich's simple model: a quadratic membrane and a recovery variable, with which a few parameters give the cortex's firing patterns.";
  static constexpr std::string_view citation = "Izhikevich 2003, IEEE Trans. Neural Netw. 14, 1569-1572";
  static constexpr std::size_t n = 2;
  struct Params {
    double a = 20.0, b = 200.0, c = -65 * unit::mV, d = 8.0, V_peak = 30 * unit::mV, C_m = 1 * unit::pF, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 7> parameters{{
      {"a", &Params::a, dim::frequency, "rate of recovery (0.02/ms in the paper's regular spiking)"},
      {"b", &Params::b, dim::frequency, "sensitivity of the recovery to the potential (0.2/ms)"},
      {"c", &Params::c, dim::voltage, "reset potential"},
      {"d", &Params::d, dim::voltage / dim::time, "jump of the recovery at a spike (8 mV/ms)"},
      {"V_peak", &Params::V_peak, dim::voltage, "the potential at which the spike is cut"},
      {"C_m", &Params::C_m, dim::capacitance, "the capacitance that turns a current into the model's input"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"U", dim::voltage / dim::time, "recovery variable"}}};
  static constexpr std::array<double, n> scale{1e-3, 1.0};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-11;
  static constexpr std::array<Receptor, 1> receptors{{{"delta", 0, "a jump of the potential (V)"}}};
  static constexpr std::array<bool, n> held{false, false};
  static constexpr Method method = Method::rk4;
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    const double v = x[0] * 1e3;  // mV
    dx[0] = 0.04 * v * v + 5 * v + 140 - x[1] + (p.I_e + u) / p.C_m;
    dx[1] = p.a * (p.b * x[0] - x[1]);
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_peak; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.c; x[1] += p.d; }
  static double dwell(const Params&) { return 0; }
  static State<n> initial(const Params& p) { return {p.c, p.b * p.c}; }
};

// ---- izhikevich_2007 ----------------------------------------------------------------------------------
// The simple model in physical units (Izhikevich 2007, ch. 8):
//   C V' = k (V - V_r)(V - V_t) - U + I,   U' = a (b (V - V_r) - U);   at V >= V_peak: V <- c, U <- U + d.
// The defaults are the book's regular-spiking pyramidal neuron: C = 100 pF, k = 0.7 pA/mV^2,
// V_r = -60 mV, V_t = -40 mV, V_peak = 35 mV, a = 0.03/ms, b = -2 nS, c = -50 mV, d = 100 pA.
// The equilibria satisfy (V - V_r)(k (V - V_t) - b) = -I, so the resting state meets the saddle
// and disappears at the rheobase I = (k (V_t - V_r) + b)^2 / (4 k), 51.4 pA for the defaults.
// Every term is evaluated at min(V, V_peak), as for adex.
struct Izhikevich2007 {
  static constexpr std::string_view name = "izhikevich_2007";
  static constexpr std::string_view summary = "Izhikevich's simple model in physical units: a quadratic membrane with its capacitance and a recovery current; the defaults are the book's regular-spiking neuron.";
  static constexpr std::string_view citation = "Izhikevich 2007, Dynamical Systems in Neuroscience, MIT Press, ch. 8";
  static constexpr std::size_t n = 4;
  struct Params {
    double C_m = 100 * unit::pF, k = 0.7e-6, V_r = -60 * unit::mV, V_t = -40 * unit::mV, V_peak = 35 * unit::mV;
    double a = 30.0, b = -2 * unit::nS, c = -50 * unit::mV, d = 100 * unit::pA;
    double tau_syn_ex = 2 * unit::ms, tau_syn_in = 2 * unit::ms, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 12> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"k", &Params::k, dim::conductance / dim::voltage, "gain of the quadratic membrane (0.7 pA/mV^2)"},
      {"V_r", &Params::V_r, dim::voltage, "resting potential"},
      {"V_t", &Params::V_t, dim::voltage, "instantaneous threshold potential"},
      {"V_peak", &Params::V_peak, dim::voltage, "the potential at which the spike is cut"},
      {"a", &Params::a, dim::frequency, "rate of recovery (0.03/ms)"},
      {"b", &Params::b, dim::conductance, "sensitivity of the recovery to the potential (negative: amplifying)"},
      {"c", &Params::c, dim::voltage, "reset potential"},
      {"d", &Params::d, dim::current, "jump of the recovery current at a spike"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"U", dim::current, "recovery current"},
      {"I_ex", dim::current, "excitatory synaptic current"}, {"I_in", dim::current, "inhibitory synaptic current"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-10, 1e-10, 1e-10};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 2, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 3, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{false, false, false, false};
  static constexpr Method method = Method::dopri5;
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    const double V = std::min(x[0], p.V_peak);
    dx[0] = (p.k * (V - p.V_r) * (V - p.V_t) - x[1] + x[2] + x[3] + p.I_e + u) / p.C_m;
    dx[1] = p.a * (p.b * (V - p.V_r) - x[1]);
    dx[2] = -x[2] / p.tau_syn_ex;
    dx[3] = -x[3] / p.tau_syn_in;
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_peak; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.c; x[1] += p.d; }
  static double dwell(const Params&) { return 0; }
  static State<n> initial(const Params& p) { return {p.V_r, 0, 0, 0}; }
};

// ---- hodgkin_huxley -----------------------------------------------------------------------------------
// C V' = -g_Na m^3 h (V - E_Na) - g_K n^4 (V - E_K) - g_L (V - E_L) + I; each gate
// x' = alpha_x (1 - x) - beta_x x with the rates of Hodgkin and Huxley (1952), shifted to a
// resting potential of -65 mV (Dayan and Abbott 2001, §5.6), per ms with V in mV:
//   alpha_n = 0.01 (V + 55) / (1 - exp(-(V + 55) / 10)),  beta_n = 0.125 exp(-(V + 65) / 80),
//   alpha_m = 0.1 (V + 40) / (1 - exp(-(V + 40) / 10)),   beta_m = 4 exp(-(V + 65) / 18),
//   alpha_h = 0.07 exp(-(V + 65) / 20),                    beta_h = 1 / (1 + exp(-(V + 35) / 10)).
// A spike is the upward crossing of V_spike, after which no other is counted for t_ref.
struct HodgkinHuxley {
  static constexpr std::string_view name = "hodgkin_huxley";
  static constexpr std::string_view summary = "The Hodgkin-Huxley neuron: sodium, potassium and leak currents with their gates, for a patch of 100 pF.";
  static constexpr std::string_view citation = "Hodgkin and Huxley 1952, J. Physiol. 117, 500-544; NEST hh_psc_alpha";
  static constexpr std::size_t n = 6;
  struct Params {
    double C_m = 100 * unit::pF, g_Na = 12000 * unit::nS, g_K = 3600 * unit::nS, g_L = 30 * unit::nS;
    double E_Na = 50 * unit::mV, E_K = -77 * unit::mV, E_L = -54.402 * unit::mV, V_spike = 0 * unit::mV, t_ref = 2 * unit::ms;
    double tau_syn_ex = 0.2 * unit::ms, tau_syn_in = 2 * unit::ms, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 12> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"g_Na", &Params::g_Na, dim::conductance, "peak sodium conductance"},
      {"g_K", &Params::g_K, dim::conductance, "peak potassium conductance"},
      {"g_L", &Params::g_L, dim::conductance, "leak conductance"},
      {"E_Na", &Params::E_Na, dim::voltage, "sodium reversal potential"},
      {"E_K", &Params::E_K, dim::voltage, "potassium reversal potential"},
      {"E_L", &Params::E_L, dim::voltage, "leak reversal potential"},
      {"V_spike", &Params::V_spike, dim::voltage, "the potential whose upward crossing is a spike"},
      {"t_ref", &Params::t_ref, dim::time, "time after a spike in which no other is counted"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"m", dim::one, "sodium activation"}, {"h", dim::one, "sodium inactivation"},
      {"n", dim::one, "potassium activation"}, {"I_ex", dim::current, "excitatory synaptic current"}, {"I_in", dim::current, "inhibitory synaptic current"}}};
  static constexpr std::array<double, n> scale{1e-3, 1, 1, 1, 1e-10, 1e-10};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 4, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 5, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{false, false, false, false, false, false};
  static constexpr std::array<bool, n> gate{false, true, true, true, false, false};
  static constexpr Method method = Method::dopri5;

  // The rates at V (volts), per second: {alpha_m, beta_m, alpha_h, beta_h, alpha_n, beta_n}.
  static std::array<double, 6> rates(double V) {
    const double v = V * 1e3;
    return {1e3 * 1.0 * exprel((v + 40) / 10), 1e3 * 4 * std::exp(-(v + 65) / 18),
            1e3 * 0.07 * std::exp(-(v + 65) / 20), 1e3 / (1 + std::exp(-(v + 35) / 10)),
            1e3 * 0.1 * exprel((v + 55) / 10), 1e3 * 0.125 * std::exp(-(v + 65) / 80)};
  }
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    const auto r = rates(x[0]);
    const double m = x[1], h = x[2], k = x[3];
    const double I_Na = p.g_Na * m * m * m * h * (x[0] - p.E_Na), I_K = p.g_K * k * k * k * k * (x[0] - p.E_K), I_L = p.g_L * (x[0] - p.E_L);
    dx[0] = (-I_Na - I_K - I_L + x[4] + x[5] + p.I_e + u) / p.C_m;
    dx[1] = r[0] * (1 - m) - r[1] * m;
    dx[2] = r[2] * (1 - h) - r[3] * h;
    dx[3] = r[4] * (1 - k) - r[5] * k;
    dx[4] = -x[4] / p.tau_syn_ex;
    dx[5] = -x[5] / p.tau_syn_in;
  }
  static void gates(const Params&, const State<n>& x, State<n>& inf, State<n>& tau) {
    const auto r = rates(x[0]);
    for (int g = 0; g < 3; g++) {
      const double s = r[2 * g] + r[2 * g + 1];
      inf[1 + g] = r[2 * g] / s;
      tau[1 + g] = 1 / s;
    }
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_spike; }
  static void jump(const Params&, State<n>&) {}
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params&) {
    const double V = -65 * unit::mV;
    const auto r = rates(V);
    return {V, r[0] / (r[0] + r[1]), r[2] / (r[2] + r[3]), r[4] / (r[4] + r[5]), 0, 0};
  }
};

// ---- qif --------------------------------------------------------------------------------------------
// tau v' = v^2 + c with c = eta + I held over a step has the closed-form flow
//   c > 0:  v(t) = s tan(atan(v0 / s) + s t / tau),     s = sqrt(c);
//   c < 0:  s = sqrt(-c), and v(t) = -s tanh(s t / tau - atanh(v0 / s))   for |v0| < s,
//                                 v(t) = -s coth(s t / tau - acoth(v0 / s))  for v0 > s,
//                                 v(t) = -s coth(s t / tau + acoth(-v0 / s)) for v0 < -s;
//   c = 0:  v(t) = v0 / (1 - v0 t / tau);
// a trajectory that reaches +infinity within the step has passed v_peak, and is placed there
// for the guard. The neuron is reset to v_reset and held for t_ref, the time the full model
// takes from v_peak to +infinity and from -infinity to v_reset (2 tau / v_peak when
// v_reset = -v_peak; Montbrió, Pazó and Roxin 2015, Appendix).
struct Qif {
  static constexpr std::string_view name = "qif";
  static constexpr std::string_view summary = "Quadratic integrate-and-fire neuron in normalised units, tau v' = v^2 + eta + I, integrated by its exact flow.";
  static constexpr std::string_view citation = "Ermentrout and Kopell 1986, SIAM J. Appl. Math. 46, 233-253; Montbrió, Pazó and Roxin 2015, Phys. Rev. X 5, 021028";
  static constexpr std::size_t n = 1;
  struct Params {
    double tau = 10 * unit::ms, eta = 0, v_peak = 100, v_reset = -100, t_ref = 0.2 * unit::ms;
  };
  static constexpr std::array<Parameter<Params>, 5> parameters{{
      {"tau", &Params::tau, dim::time, "membrane time constant"},
      {"eta", &Params::eta, dim::one, "excitability (the constant drive)"},
      {"v_peak", &Params::v_peak, dim::one, "the value at which a spike is counted"},
      {"v_reset", &Params::v_reset, dim::one, "the value to which it is reset"},
      {"t_ref", &Params::t_ref, dim::time, "time held after a spike (2 tau / v_peak stands for the passage through infinity)"},
  }};
  static constexpr std::array<Component, n> components{{{"v", dim::one, "normalised membrane potential"}}};
  static constexpr std::array<double, n> scale{1.0};
  static constexpr Dimension input = dim::one;
  static constexpr double input_scale = 1.0;
  static constexpr std::array<Receptor, 1> receptors{{{"delta", 0, "a jump of v (dimensionless)"}}};
  static constexpr std::array<bool, n> held{true};
  static constexpr Method method = Method::exact;
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) { dx[0] = (x[0] * x[0] + p.eta + u) / p.tau; }
  static void advance(const Params& p, State<n>& x, double u, double h, const std::array<bool, n>& held) {
    if (held[0]) return;
    const double c = p.eta + u, v0 = x[0], r = h / p.tau;
    double v;
    if (std::fabs(c) < 1e-12) {
      v = v0 * r >= 1 ? p.v_peak : v0 / (1 - v0 * r);
    } else if (c > 0) {
      const double s = std::sqrt(c), theta = std::atan(v0 / s) + s * r;
      v = theta >= std::numbers::pi / 2 ? p.v_peak : s * std::tan(theta);
    } else {
      const double s = std::sqrt(-c), y = v0 / s;
      if (std::fabs(y) < 1) v = -s * std::tanh(s * r - std::atanh(y));
      else if (y > 1) {
        // -s coth(phi) with phi = -acoth(y) + s r rising to 0, where v reaches +infinity.
        const double phi = -0.5 * std::log((y + 1) / (y - 1)) + s * r;
        v = phi >= 0 ? p.v_peak : -s / std::tanh(phi);
      } else if (y < -1) {
        const double phi = 0.5 * std::log((y - 1) / (y + 1)) + s * r;  // acoth(-y) + s r
        v = -s / std::tanh(phi);
      } else {
        v = v0;  // a fixed point
      }
    }
    x[0] = std::max(v, -std::numeric_limits<double>::max());
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.v_peak; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.v_reset; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.v_reset}; }
};

// ---- resonate_and_fire ------------------------------------------------------------------------------------
// z' = (b + i omega) z + I / C on z = x + i y: x' = b x - omega y + I / C, y' = omega x + b y;
// it fires when y reaches the threshold, and z is reset to 0. Linear, integrated exactly.
struct ResonateAndFire {
  static constexpr std::string_view name = "resonate_and_fire";
  static constexpr std::string_view summary = "Resonate-and-fire neuron: a damped linear oscillator that fires when its imaginary part reaches a threshold, selective for input at its own frequency.";
  static constexpr std::string_view citation = "Izhikevich 2001, Neural Netw. 14, 883-894; Orchard et al. 2021, IEEE SiPS (Loihi 2)";
  static constexpr std::size_t n = 2;
  struct Params {
    double C_m = 250 * unit::pF, tau = 20 * unit::ms, frequency = 10 * unit::Hz, threshold = 1 * unit::mV, t_ref = 0, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 6> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "the capacitance that turns a current into the oscillator's drive"},
      {"tau", &Params::tau, dim::time, "damping time (b = -1 / tau)"},
      {"frequency", &Params::frequency, dim::frequency, "frequency of the oscillation"},
      {"threshold", &Params::threshold, dim::voltage, "the value of y at which it fires"},
      {"t_ref", &Params::t_ref, dim::time, "refractory period"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{{"x", dim::voltage, "real part"}, {"y", dim::voltage, "imaginary part"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-3};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 1> receptors{{{"delta", 0, "a jump of the real part (V)"}}};
  static constexpr std::array<bool, n> held{true, true};
  static constexpr Method method = Method::exact;
  static void system(const Params& p, pd::Matrix& A, State<n>& B, State<n>& c) {
    const double b = -1 / p.tau, w = 2 * std::numbers::pi * p.frequency;
    A(0, 0) = b; A(0, 1) = -w;
    A(1, 0) = w; A(1, 1) = b;
    B = {1 / p.C_m, 0};
    c = {p.I_e / p.C_m, 0};
  }
  static bool guard(const Params& p, const State<n>& x) { return x[1] >= p.threshold; }
  static void jump(const Params&, State<n>& x) { x = {0, 0}; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params&) { return {0, 0}; }
};

// ---- brf --------------------------------------------------------------------------------------------
// The balanced resonate-and-fire neuron (Higuchi, Kairat, Bohte and Otte 2024): the oscillator
// z' = (b + i omega) z + I / C on z = x + i y, firing when x reaches the threshold
// theta_c + Delta_theta q, and not reset. Its refractoriness is q, which jumps by 1 at each
// spike and decays with tau_q, and which both raises the threshold and deepens the damping,
// b = -b_offset - Delta_b q: a spike is followed by a few more at the crest of the
// oscillation, until the threshold outruns it, and the oscillation is damped as it fires.
//
// The paper steps the oscillator by Euler's method, z <- z + h ((b + i omega) z + I), whose
// amplification |1 + h (b + i omega)| exceeds 1 unless b lies below the divergence boundary
// p(omega) = (-1 + sqrt(1 - (h omega)^2)) / h; it therefore sets b = p(omega) - b' - q. Here
// the oscillator is advanced by its exact flow, stable for every b <= 0, and p(omega) -> 0 as
// h -> 0 leaves b = -b' - q, the continuous model the paper's step approximates. Over a step
// q(t) = q_0 e^{-t / tau_q} is known, so the free part of z is multiplied by
// exp(int (b + i omega) dt), exactly; the input, held over the step, is integrated with the
// step's mean of b, which is exact while q is still and of second order in h while it decays
// (at 0.1 ms, an error of about 1e-11 V per step after a spike).
//
// With the paper's time unit T (its step is 0.01 T and gamma = 0.9 per step), Delta_theta =
// theta_c, Delta_b = 1 / T and tau_q = -0.01 T / ln 0.9 = 0.095 T; the defaults take
// T = 100 ms for an oscillator of 10 Hz, with b_offset in the paper's range (2 to 3) / T.
struct Brf {
  static constexpr std::string_view name = "brf";
  static constexpr std::string_view summary = "Balanced resonate-and-fire neuron: a damped oscillator that fires without a reset, its refractoriness raising the threshold and deepening the damping; advanced by its exact flow.";
  static constexpr std::string_view citation =
      "Higuchi, Kairat, Bohte and Otte 2024, Proc. 41st ICML, PMLR 235, 18305-18323 (arXiv:2402.14603); Izhikevich 2001, Neural Netw. 14, 883-894";
  static constexpr std::size_t n = 3;
  struct Params {
    double C_m = 250 * unit::pF, frequency = 10 * unit::Hz, b_offset = 25.0, Delta_b = 10.0, tau_q = 9.5 * unit::ms;
    double theta_c = 1 * unit::mV, Delta_theta = 1 * unit::mV, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 8> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "the capacitance that turns a current into the oscillator's drive"},
      {"frequency", &Params::frequency, dim::frequency, "frequency of the oscillation"},
      {"b_offset", &Params::b_offset, dim::frequency, "damping at rest (b' in the paper)"},
      {"Delta_b", &Params::Delta_b, dim::frequency, "damping added per unit of refractoriness"},
      {"tau_q", &Params::tau_q, dim::time, "decay time of the refractoriness"},
      {"theta_c", &Params::theta_c, dim::voltage, "threshold at rest"},
      {"Delta_theta", &Params::Delta_theta, dim::voltage, "threshold added per unit of refractoriness"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"x", dim::voltage, "real part, compared with the threshold"}, {"y", dim::voltage, "imaginary part"},
      {"q", dim::one, "refractoriness: 1 more at each spike, decaying with tau_q"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-3, 1.0};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 1> receptors{{{"delta", 0, "a jump of the real part (V)"}}};
  static constexpr std::array<bool, n> held{false, false, false};
  static constexpr Method method = Method::exact;
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    const double b = -p.b_offset - p.Delta_b * x[2], w = 2 * std::numbers::pi * p.frequency;
    dx[0] = b * x[0] - w * x[1] + (p.I_e + u) / p.C_m;
    dx[1] = w * x[0] + b * x[1];
    dx[2] = -x[2] / p.tau_q;
  }
  static void advance(const Params& p, State<n>& x, double u, double h, const std::array<bool, n>&) {
    const double w = 2 * std::numbers::pi * p.frequency, r = h / p.tau_q;
    const double q_mean = r > 0 ? x[2] * -std::expm1(-r) / r : x[2];  // the mean of q over the step
    const double b = -p.b_offset - p.Delta_b * q_mean, a = b * h, th = w * h;
    const std::complex<double> lambda(b, w), z(x[0], x[1]);
    const std::complex<double> E(std::exp(a) * std::cos(th), std::exp(a) * std::sin(th));
    // (e^{lambda h} - 1) / lambda, without cancellation where lambda h is small.
    const double s = std::sin(th / 2);
    const std::complex<double> E1(std::expm1(a) * std::cos(th) - 2 * s * s, std::exp(a) * std::sin(th));
    const std::complex<double> phi = std::abs(lambda) * h < 1e-12 ? std::complex<double>(h, 0) : E1 / lambda;
    const std::complex<double> next = E * z + phi * ((p.I_e + u) / p.C_m);
    x[0] = next.real();
    x[1] = next.imag();
    x[2] *= std::exp(-r);
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.theta_c + p.Delta_theta * x[2]; }
  static void jump(const Params&, State<n>& x) { x[2] += 1; }
  static double dwell(const Params&) { return 0; }
  static State<n> initial(const Params&) { return {0, 0, 0}; }
};

}  // namespace neuroscience::snn::models
