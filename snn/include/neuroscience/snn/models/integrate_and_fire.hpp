// Integrate-and-fire neurons whose subthreshold dynamics are linear, integrated exactly
// (physis/dynamics, Rotter and Diesmann 1999). All quantities in SI units; the defaults are
// those of NEST's models of the same names where they exist (Gewaltig and Diesmann 2007,
// NEST 3 documentation), so that published networks can be stated in the same numbers.
//
// - lif_psc_delta: a spike jumps the potential (Brunel 2000's network).
// - lif_psc_exp:   exponentially decaying synaptic currents (iaf_psc_exp).
// - lif_psc_alpha: alpha-function synaptic currents, peaking at tau after the spike (iaf_psc_alpha).
// - alif:          an adaptive threshold that rises by beta at each spike and decays with
//                  tau_a (Bellec et al. 2018, the long short-term memory spiking network).
// - glif:          the generalised leaky integrate-and-fire model of the Allen Institute
//                  (Teeter et al. 2018): a reset rule, a spike-triggered and a
//                  voltage-dependent threshold, two after-spike currents; GLIF1 to GLIF5
//                  by which of them are switched on.
// - mat2:          a multi-timescale adaptive threshold without a reset of the potential
//                  (Kobayashi, Tsubo and Shinomoto 2009).
// - lif_escape:    a leaky integrate-and-fire neuron that fires by escape noise, at the
//                  rate rho_0 exp((V - V_th) / Delta_V) (Gerstner and Kistler 2002, §5.3;
//                  Jolivet et al. 2006).

#pragma once

#include <array>
#include <cmath>
#include <numbers>

#include "../model.hpp"

namespace neuroscience::snn::models {

using pd::Method;

// ---- parrot ------------------------------------------------------------------------------------------
// It fires at the time of every input that arrives on its "spike" receptor, and does nothing
// else: a device's spikes passed on as a neuron's, so that synapses (and their plasticity)
// can be driven at chosen times. Input on its "silent" receptor is summed and never fires
// it, so that the weights a synapse transmits can be read.
struct Parrot {
  static constexpr std::string_view name = "parrot";
  static constexpr std::string_view summary = "Repeats every spike it receives, at the time it arrives; a source of spikes at chosen times.";
  static constexpr std::string_view citation = "NEST parrot_neuron (Gewaltig and Diesmann 2007, Scholarpedia 2, 1430)";
  static constexpr std::size_t n = 2;
  struct Params {
    double unused = 0;
  };
  static constexpr std::array<Parameter<Params>, 0> parameters{};
  static constexpr std::array<Component, n> components{{
      {"input", dim::one, "input on the spike receptor since the last spike"}, {"silent", dim::one, "the sum of the input on the silent receptor"}}};
  static constexpr std::array<double, n> scale{1.0, 1.0};
  static constexpr Dimension input = dim::one;
  static constexpr double input_scale = 1.0;
  static constexpr std::array<Receptor, 2> receptors{{
      {"spike", 0, "any positive weight makes it fire"}, {"silent", 1, "summed, never firing (dimensionless)"}}};
  static constexpr std::array<bool, n> held{false, false};
  static constexpr Method method = Method::exact;
  static void system(const Params&, pd::Matrix&, State<n>& B, State<n>& c) { B = {0, 0}; c = {0, 0}; }
  static bool guard(const Params&, const State<n>& x) { return x[0] > 0; }
  static void jump(const Params&, State<n>& x) { x[0] = 0; }
  static double dwell(const Params&) { return 0; }
  static State<n> initial(const Params&) { return {0, 0}; }
};

// ---- lif_psc_delta ---------------------------------------------------------------------------------
struct LifPscDelta {
  static constexpr std::string_view name = "lif_psc_delta";
  static constexpr std::string_view summary = "Leaky integrate-and-fire neuron; a spike jumps the membrane potential by its weight.";
  static constexpr std::string_view citation = "Brunel 2000, J. Comput. Neurosci. 8, 183-208; NEST iaf_psc_delta";
  static constexpr std::size_t n = 1;
  struct Params {
    double C_m = 250 * unit::pF, tau_m = 10 * unit::ms, t_ref = 2 * unit::ms;
    double E_L = -70 * unit::mV, V_reset = -70 * unit::mV, V_th = -55 * unit::mV, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 7> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"tau_m", &Params::tau_m, dim::time, "membrane time constant"},
      {"t_ref", &Params::t_ref, dim::time, "refractory period, the potential held at V_reset"},
      {"E_L", &Params::E_L, dim::voltage, "resting potential"},
      {"V_reset", &Params::V_reset, dim::voltage, "reset potential"},
      {"V_th", &Params::V_th, dim::voltage, "threshold"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{{"V", dim::voltage, "membrane potential"}}};
  static constexpr std::array<double, n> scale{1e-3};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 1> receptors{{{"delta", 0, "a jump of the potential (V)"}}};
  static constexpr std::array<bool, n> held{true};
  static constexpr Method method = Method::exact;
  static void system(const Params& p, pd::Matrix& A, State<n>& B, State<n>& c) {
    A(0, 0) = -1 / p.tau_m;
    B = {1 / p.C_m};
    c = {p.E_L / p.tau_m + p.I_e / p.C_m};
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_th; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.V_reset; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L}; }
};

// ---- lif_psc_exp ------------------------------------------------------------------------------------
struct LifPscExp {
  static constexpr std::string_view name = "lif_psc_exp";
  static constexpr std::string_view summary = "Leaky integrate-and-fire neuron with exponentially decaying excitatory and inhibitory synaptic currents.";
  static constexpr std::string_view citation = "Rotter and Diesmann 1999, Biol. Cybern. 81, 381-402; NEST iaf_psc_exp";
  static constexpr std::size_t n = 3;
  struct Params {
    double C_m = 250 * unit::pF, tau_m = 10 * unit::ms, tau_syn_ex = 2 * unit::ms, tau_syn_in = 2 * unit::ms, t_ref = 2 * unit::ms;
    double E_L = -70 * unit::mV, V_reset = -70 * unit::mV, V_th = -55 * unit::mV, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 9> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"tau_m", &Params::tau_m, dim::time, "membrane time constant"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"t_ref", &Params::t_ref, dim::time, "refractory period, the potential held at V_reset"},
      {"E_L", &Params::E_L, dim::voltage, "resting potential"},
      {"V_reset", &Params::V_reset, dim::voltage, "reset potential"},
      {"V_th", &Params::V_th, dim::voltage, "threshold"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"I_ex", dim::current, "excitatory synaptic current"}, {"I_in", dim::current, "inhibitory synaptic current"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-10, 1e-10};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 1, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 2, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{true, false, false};
  static constexpr Method method = Method::exact;
  static void system(const Params& p, pd::Matrix& A, State<n>& B, State<n>& c) {
    A(0, 0) = -1 / p.tau_m; A(0, 1) = 1 / p.C_m; A(0, 2) = 1 / p.C_m;
    A(1, 1) = -1 / p.tau_syn_ex;
    A(2, 2) = -1 / p.tau_syn_in;
    B = {1 / p.C_m, 0, 0};
    c = {p.E_L / p.tau_m + p.I_e / p.C_m, 0, 0};
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_th; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.V_reset; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L, 0, 0}; }
};

// ---- lif_psc_alpha -----------------------------------------------------------------------------------
// A spike of weight w starts I(t) = w (e / tau) t exp(-t / tau), peaking at w when t = tau:
// I' = J - I / tau, J' = -J / tau, the spike adding w e / tau to J.
struct LifPscAlpha {
  static constexpr std::string_view name = "lif_psc_alpha";
  static constexpr std::string_view summary = "Leaky integrate-and-fire neuron with alpha-function synaptic currents, each peaking at its weight tau after the spike.";
  static constexpr std::string_view citation = "Rotter and Diesmann 1999, Biol. Cybern. 81, 381-402; NEST iaf_psc_alpha";
  static constexpr std::size_t n = 5;
  struct Params {
    double C_m = 250 * unit::pF, tau_m = 10 * unit::ms, tau_syn_ex = 2 * unit::ms, tau_syn_in = 2 * unit::ms, t_ref = 2 * unit::ms;
    double E_L = -70 * unit::mV, V_reset = -70 * unit::mV, V_th = -55 * unit::mV, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 9> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"tau_m", &Params::tau_m, dim::time, "membrane time constant"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "rise time to the peak of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "rise time to the peak of the inhibitory current"},
      {"t_ref", &Params::t_ref, dim::time, "refractory period"},
      {"E_L", &Params::E_L, dim::voltage, "resting potential"},
      {"V_reset", &Params::V_reset, dim::voltage, "reset potential"},
      {"V_th", &Params::V_th, dim::voltage, "threshold"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"},
      {"J_ex", dim::current / dim::time, "rate of rise of the excitatory current"}, {"I_ex", dim::current, "excitatory synaptic current"},
      {"J_in", dim::current / dim::time, "rate of rise of the inhibitory current"}, {"I_in", dim::current, "inhibitory synaptic current"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-7, 1e-10, 1e-7, 1e-10};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 1, "an alpha-shaped excitatory current peaking at the weight (A, positive)"},
      {"inhibitory", 3, "an alpha-shaped inhibitory current peaking at the weight (A, negative)"}}};
  static constexpr std::array<bool, n> held{true, false, false, false, false};
  static constexpr Method method = Method::exact;
  static void system(const Params& p, pd::Matrix& A, State<n>& B, State<n>& c) {
    A(0, 0) = -1 / p.tau_m; A(0, 2) = 1 / p.C_m; A(0, 4) = 1 / p.C_m;
    A(1, 1) = -1 / p.tau_syn_ex; A(2, 1) = 1; A(2, 2) = -1 / p.tau_syn_ex;
    A(3, 3) = -1 / p.tau_syn_in; A(4, 3) = 1; A(4, 4) = -1 / p.tau_syn_in;
    B = {1 / p.C_m, 0, 0, 0, 0};
    c = {p.E_L / p.tau_m + p.I_e / p.C_m, 0, 0, 0, 0};
  }
  static void receive(const Params& p, State<n>& x, std::size_t r, double w) {
    if (r == 0) x[1] += w * std::numbers::e / p.tau_syn_ex;
    else x[3] += w * std::numbers::e / p.tau_syn_in;
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_th; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.V_reset; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L, 0, 0, 0, 0}; }
};

// ---- alif ------------------------------------------------------------------------------------------
struct Alif {
  static constexpr std::string_view name = "alif";
  static constexpr std::string_view summary = "Leaky integrate-and-fire neuron with an adaptive threshold that rises by beta at each spike and relaxes with tau_a.";
  static constexpr std::string_view citation = "Bellec, Salaj, Subramoney, Legenstein and Maass 2018, Advances in Neural Information Processing Systems 31 (NeurIPS 2018), arXiv:1803.09574";
  static constexpr std::size_t n = 4;
  struct Params {
    double C_m = 250 * unit::pF, tau_m = 20 * unit::ms, tau_syn_ex = 2 * unit::ms, tau_syn_in = 2 * unit::ms, t_ref = 2 * unit::ms;
    double E_L = -70 * unit::mV, V_reset = -70 * unit::mV, V_th = -50 * unit::mV, tau_a = 200 * unit::ms, beta = 1.5 * unit::mV, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 11> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"tau_m", &Params::tau_m, dim::time, "membrane time constant"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"t_ref", &Params::t_ref, dim::time, "refractory period"},
      {"E_L", &Params::E_L, dim::voltage, "resting potential"},
      {"V_reset", &Params::V_reset, dim::voltage, "reset potential"},
      {"V_th", &Params::V_th, dim::voltage, "baseline threshold"},
      {"tau_a", &Params::tau_a, dim::time, "relaxation time of the threshold's adaptation"},
      {"beta", &Params::beta, dim::voltage, "rise of the threshold at each spike"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"a", dim::voltage, "adaptation of the threshold"},
      {"I_ex", dim::current, "excitatory synaptic current"}, {"I_in", dim::current, "inhibitory synaptic current"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-3, 1e-10, 1e-10};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 2, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 3, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{true, false, false, false};
  static constexpr Method method = Method::exact;
  static void system(const Params& p, pd::Matrix& A, State<n>& B, State<n>& c) {
    A(0, 0) = -1 / p.tau_m; A(0, 2) = 1 / p.C_m; A(0, 3) = 1 / p.C_m;
    A(1, 1) = -1 / p.tau_a;
    A(2, 2) = -1 / p.tau_syn_ex;
    A(3, 3) = -1 / p.tau_syn_in;
    B = {1 / p.C_m, 0, 0, 0};
    c = {p.E_L / p.tau_m + p.I_e / p.C_m, 0, 0, 0};
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.V_th + x[1]; }
  static void jump(const Params& p, State<n>& x) { x[0] = p.V_reset; x[1] += p.beta; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L, 0, 0, 0}; }
};

// ---- glif ------------------------------------------------------------------------------------------
// Teeter et al. 2018, Nat. Commun. 9, 709, Methods: C V' = -G (V - E_L) + sum_j I_j + I_syn + I_e;
// the threshold theta_inf + theta_s + theta_v with theta_s' = -b_s theta_s and
// theta_v' = a_v (V - E_L) - b_v theta_v; after-spike currents I_j' = -k_j I_j. At a spike:
// V <- E_L + f_v (V - E_L) + V_a, theta_s <- theta_s + delta_theta_s, I_j <- A_j + r_j I_j.
// GLIF1 (LIF): f_v = 0, V_a = V_reset - E_L, the rest 0; GLIF2 adds the reset rule and
// theta_s; GLIF3 the after-spike currents; GLIF4 both; GLIF5 also theta_v. The defaults are
// those of NEST's glif_psc, from an Allen Cell Types neuron.
struct Glif {
  static constexpr std::string_view name = "glif";
  static constexpr std::string_view summary = "Generalised leaky integrate-and-fire neuron (GLIF1-5): reset rule, spike-triggered and voltage-dependent threshold, after-spike currents.";
  static constexpr std::string_view citation = "Teeter et al. 2018, Nat. Commun. 9, 709; NEST glif_psc";
  static constexpr std::size_t n = 7;
  struct Params {
    double C_m = 58.72 * unit::pF, G = 9.43 * unit::nS, E_L = -78.85 * unit::mV, theta_inf = -51.68 * unit::mV, t_ref = 3.75 * unit::ms;
    double f_v = 0.0, V_a = 0.0;                        // reset rule
    double delta_theta_s = 0.0, b_s = 9.0;              // spike-triggered threshold (9 /s = 0.009 /ms)
    double a_v = 0.0, b_v = 90.0;                       // voltage-dependent threshold (1/s)
    double A_1 = 0.0, A_2 = 0.0, k_1 = 3.0, k_2 = 100.0, r_1 = 1.0, r_2 = 1.0;  // after-spike currents
    double tau_syn_ex = 2 * unit::ms, tau_syn_in = 2 * unit::ms, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 20> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"G", &Params::G, dim::conductance, "membrane conductance"},
      {"E_L", &Params::E_L, dim::voltage, "resting potential"},
      {"theta_inf", &Params::theta_inf, dim::voltage, "instantaneous threshold"},
      {"t_ref", &Params::t_ref, dim::time, "refractory period"},
      {"f_v", &Params::f_v, dim::one, "fraction of the depolarisation kept at reset"},
      {"V_a", &Params::V_a, dim::voltage, "added to the reset potential"},
      {"delta_theta_s", &Params::delta_theta_s, dim::voltage, "rise of the spike-triggered threshold at each spike"},
      {"b_s", &Params::b_s, dim::frequency, "decay rate of the spike-triggered threshold"},
      {"a_v", &Params::a_v, dim::frequency, "coupling of the voltage-dependent threshold to the depolarisation"},
      {"b_v", &Params::b_v, dim::frequency, "decay rate of the voltage-dependent threshold"},
      {"A_1", &Params::A_1, dim::current, "amplitude of the first after-spike current"},
      {"A_2", &Params::A_2, dim::current, "amplitude of the second after-spike current"},
      {"k_1", &Params::k_1, dim::frequency, "decay rate of the first after-spike current"},
      {"k_2", &Params::k_2, dim::frequency, "decay rate of the second after-spike current"},
      {"r_1", &Params::r_1, dim::one, "fraction of the first after-spike current kept at a spike"},
      {"r_2", &Params::r_2, dim::one, "fraction of the second after-spike current kept at a spike"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"theta_s", dim::voltage, "spike-triggered threshold"},
      {"theta_v", dim::voltage, "voltage-dependent threshold"}, {"I_1", dim::current, "first after-spike current"},
      {"I_2", dim::current, "second after-spike current"}, {"I_ex", dim::current, "excitatory synaptic current"},
      {"I_in", dim::current, "inhibitory synaptic current"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-3, 1e-3, 1e-10, 1e-10, 1e-10, 1e-10};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 5, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 6, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{true, false, false, false, false, false, false};
  static constexpr Method method = Method::exact;
  static void system(const Params& p, pd::Matrix& A, State<n>& B, State<n>& c) {
    A(0, 0) = -p.G / p.C_m; A(0, 3) = 1 / p.C_m; A(0, 4) = 1 / p.C_m; A(0, 5) = 1 / p.C_m; A(0, 6) = 1 / p.C_m;
    A(1, 1) = -p.b_s;
    A(2, 0) = p.a_v; A(2, 2) = -p.b_v;
    A(3, 3) = -p.k_1;
    A(4, 4) = -p.k_2;
    A(5, 5) = -1 / p.tau_syn_ex;
    A(6, 6) = -1 / p.tau_syn_in;
    B = {1 / p.C_m, 0, 0, 0, 0, 0, 0};
    c = {p.G * p.E_L / p.C_m + p.I_e / p.C_m, 0, -p.a_v * p.E_L, 0, 0, 0, 0};
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.theta_inf + x[1] + x[2]; }
  static void jump(const Params& p, State<n>& x) {
    x[0] = p.E_L + p.f_v * (x[0] - p.E_L) + p.V_a;
    x[1] += p.delta_theta_s;
    x[3] = p.A_1 + p.r_1 * x[3];
    x[4] = p.A_2 + p.r_2 * x[4];
  }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L, 0, 0, 0, 0, 0, 0}; }
};

// ---- mat2 -------------------------------------------------------------------------------------------
// tau_m V' = -(V - E_L) + R I with no reset; the threshold E_L + omega + theta_1 + theta_2,
// theta_j' = -theta_j / tau_j, rising by alpha_j at each spike; no spike within t_ref.
struct Mat2 {
  static constexpr std::string_view name = "mat2";
  static constexpr std::string_view summary = "Multi-timescale adaptive threshold neuron: a leaky membrane without reset and a threshold with two spike-triggered components.";
  static constexpr std::string_view citation = "Kobayashi, Tsubo and Shinomoto 2009, Front. Comput. Neurosci. 3, 9; NEST mat2_psc_exp";
  static constexpr std::size_t n = 5;
  struct Params {
    double C_m = 100 * unit::pF, tau_m = 5 * unit::ms, tau_syn_ex = 1 * unit::ms, tau_syn_in = 3 * unit::ms, t_ref = 2 * unit::ms;
    double E_L = -70 * unit::mV, omega = 19 * unit::mV, tau_1 = 10 * unit::ms, tau_2 = 200 * unit::ms;
    double alpha_1 = 37 * unit::mV, alpha_2 = 2 * unit::mV, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 12> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"tau_m", &Params::tau_m, dim::time, "membrane time constant"},
      {"tau_syn_ex", &Params::tau_syn_ex, dim::time, "decay time of the excitatory current"},
      {"tau_syn_in", &Params::tau_syn_in, dim::time, "decay time of the inhibitory current"},
      {"t_ref", &Params::t_ref, dim::time, "the shortest interval between spikes"},
      {"E_L", &Params::E_L, dim::voltage, "resting potential"},
      {"omega", &Params::omega, dim::voltage, "resting threshold above E_L"},
      {"tau_1", &Params::tau_1, dim::time, "decay time of the fast threshold component"},
      {"tau_2", &Params::tau_2, dim::time, "decay time of the slow threshold component"},
      {"alpha_1", &Params::alpha_1, dim::voltage, "rise of the fast component at each spike"},
      {"alpha_2", &Params::alpha_2, dim::voltage, "rise of the slow component at each spike"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{
      {"V", dim::voltage, "membrane potential"}, {"theta_1", dim::voltage, "fast threshold component"},
      {"theta_2", dim::voltage, "slow threshold component"}, {"I_ex", dim::current, "excitatory synaptic current"},
      {"I_in", dim::current, "inhibitory synaptic current"}}};
  static constexpr std::array<double, n> scale{1e-3, 1e-3, 1e-3, 1e-10, 1e-10};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 2> receptors{{
      {"excitatory", 3, "a jump of the excitatory current (A, positive)"}, {"inhibitory", 4, "a jump of the inhibitory current (A, negative)"}}};
  static constexpr std::array<bool, n> held{false, false, false, false, false};
  static constexpr Method method = Method::exact;
  static void system(const Params& p, pd::Matrix& A, State<n>& B, State<n>& c) {
    A(0, 0) = -1 / p.tau_m; A(0, 3) = 1 / p.C_m; A(0, 4) = 1 / p.C_m;
    A(1, 1) = -1 / p.tau_1;
    A(2, 2) = -1 / p.tau_2;
    A(3, 3) = -1 / p.tau_syn_ex;
    A(4, 4) = -1 / p.tau_syn_in;
    B = {1 / p.C_m, 0, 0, 0, 0};
    c = {p.E_L / p.tau_m + p.I_e / p.C_m, 0, 0, 0, 0};
  }
  static bool guard(const Params& p, const State<n>& x) { return x[0] >= p.E_L + p.omega + x[1] + x[2]; }
  static void jump(const Params& p, State<n>& x) { x[1] += p.alpha_1; x[2] += p.alpha_2; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L, 0, 0, 0, 0}; }
};

// ---- lif_escape -------------------------------------------------------------------------------------
struct LifEscape {
  static constexpr std::string_view name = "lif_escape";
  static constexpr std::string_view summary = "Leaky integrate-and-fire neuron firing by escape noise, at the rate rho_0 exp((V - V_th) / Delta_V).";
  static constexpr std::string_view citation = "Gerstner and Kistler 2002, Spiking Neuron Models, §5.3; Jolivet, Rauch, Lüscher and Gerstner 2006, J. Comput. Neurosci. 21, 35-49";
  static constexpr std::size_t n = 1;
  struct Params {
    double C_m = 250 * unit::pF, tau_m = 10 * unit::ms, t_ref = 2 * unit::ms;
    double E_L = -70 * unit::mV, V_reset = -70 * unit::mV, V_th = -55 * unit::mV, Delta_V = 2 * unit::mV, rho_0 = 20 * unit::Hz, I_e = 0;
  };
  static constexpr std::array<Parameter<Params>, 9> parameters{{
      {"C_m", &Params::C_m, dim::capacitance, "membrane capacitance"},
      {"tau_m", &Params::tau_m, dim::time, "membrane time constant"},
      {"t_ref", &Params::t_ref, dim::time, "dead time after a spike, the potential held at V_reset"},
      {"E_L", &Params::E_L, dim::voltage, "resting potential"},
      {"V_reset", &Params::V_reset, dim::voltage, "reset potential"},
      {"V_th", &Params::V_th, dim::voltage, "soft threshold, where the rate is rho_0"},
      {"Delta_V", &Params::Delta_V, dim::voltage, "width of the escape noise"},
      {"rho_0", &Params::rho_0, dim::frequency, "rate of firing at the threshold"},
      {"I_e", &Params::I_e, dim::current, "constant external current"},
  }};
  static constexpr std::array<Component, n> components{{{"V", dim::voltage, "membrane potential"}}};
  static constexpr std::array<double, n> scale{1e-3};
  static constexpr Dimension input = dim::current;
  static constexpr double input_scale = 1e-10;
  static constexpr std::array<Receptor, 1> receptors{{{"delta", 0, "a jump of the potential (V)"}}};
  static constexpr std::array<bool, n> held{true};
  static constexpr Method method = Method::exact;
  static void system(const Params& p, pd::Matrix& A, State<n>& B, State<n>& c) {
    A(0, 0) = -1 / p.tau_m;
    B = {1 / p.C_m};
    c = {p.E_L / p.tau_m + p.I_e / p.C_m};
  }
  static bool guard(const Params&, const State<n>&) { return false; }
  static double hazard(const Params& p, const State<n>& x) { return p.rho_0 * std::exp((x[0] - p.V_th) / p.Delta_V); }
  static void jump(const Params& p, State<n>& x) { x[0] = p.V_reset; }
  static double dwell(const Params& p) { return p.t_ref; }
  static State<n> initial(const Params& p) { return {p.E_L}; }
};

}  // namespace neuroscience::snn::models
