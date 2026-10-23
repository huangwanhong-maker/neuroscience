// Quantum neurons: models whose state is quantum and whose spikes are its measured events.
//
// The survey of quantum neuromorphic models (development/ideas/2026-10-23-a-survey-of-spiking-
// models.md, §4) sorts them into Ising-type networks and open-system neurons, whose state
// obeys a GKSL master equation and whose spikes are quantum jumps. A network of the second
// kind is simulated here along quantum trajectories: each neuron carries a pure state, which
// a detected jump resets, and the average over trajectories is the master equation's density
// matrix (physis/quantum).
//
// - quantum_emitter: a driven two-level emitter whose detected photons are its spikes.

#pragma once

#include <array>
#include <cmath>
#include <complex>

#include <physis/quantum/two_level.hpp>

#include "../model.hpp"

namespace neuroscience::snn::models {

using pd::Method;

// ---- quantum_emitter ----------------------------------------------------------------------------------
// A two-level emitter (physis/quantum/two_level.hpp) driven at the Rabi frequency Omega + u,
// u its input, detuned by Delta, and decaying at gamma; every emitted photon is detected, and
// each detection is a spike, after which the emitter is in |g>. Between detections its
// amplitudes (c_g, c_e) evolve by exp(-i H_eff h), exactly, and the probability of a detection
// within the step is 1 - |c(t + h)|^2 / |c(t)|^2, exactly: the model gives its cumulative hazard,
// Lambda = Lambda_0 - ln |c|^2, and settle() renormalises c after each step, moving -ln |c|^2
// into Lambda_0, so that the state stays normalised and Lambda is unchanged. A spike arriving
// on the receptor `pulse` with weight theta rotates the state about x by theta, exp(-i theta
// sigma_x / 2): pi takes |g> to |e>, 2 pi brings it back with its sign changed.
//
// Time is the network's: the emitter's rates are chosen on the scale of its grid (gamma h
// small), not those of a physical atom. Detections are placed on the grid as spikes are, so
// that the intervals between them are exact on the grid, and the ensemble follows the master
// equation up to a shift of each trajectory by less than h at each detection.
struct QuantumEmitter {
  static constexpr std::string_view name = "quantum_emitter";
  static constexpr std::string_view summary = "A driven two-level emitter whose detected photons are its spikes: an exact quantum trajectory of its master equation; input spikes are pulses that rotate it.";
  static constexpr std::string_view citation =
      "Dalibard, Castin and Mølmer 1992, Phys. Rev. Lett. 68, 580-583; Carmichael 1993, An Open Systems Approach to Quantum Optics, Springer; Plenio and Knight 1998, Rev. Mod. Phys. 70, 101-144";
  static constexpr std::size_t n = 5;
  struct Params {
    double Omega = 400.0, Delta = 0, gamma = 100.0;
  };
  static constexpr std::array<Parameter<Params>, 3> parameters{{
      {"Omega", &Params::Omega, dim::frequency, "Rabi frequency of the drive (rad/s)"},
      {"Delta", &Params::Delta, dim::frequency, "detuning of the drive from the transition (rad/s)"},
      {"gamma", &Params::gamma, dim::frequency, "rate of spontaneous emission"},
  }};
  static constexpr std::array<Component, n> components{{
      {"c_g_re", dim::one, "real part of the ground-state amplitude"}, {"c_g_im", dim::one, "imaginary part of the ground-state amplitude"},
      {"c_e_re", dim::one, "real part of the excited-state amplitude"}, {"c_e_im", dim::one, "imaginary part of the excited-state amplitude"},
      {"Lambda", dim::one, "cumulative hazard since the last detection"}}};
  static constexpr std::array<double, n> scale{1, 1, 1, 1, 1};
  static constexpr Dimension input = dim::frequency;
  static constexpr double input_scale = 100.0;
  static constexpr std::array<Receptor, 1> receptors{{{"pulse", 0, "a rotation about x by the weight, in radians (pi: |g> to |e>)"}}};
  static constexpr std::array<bool, n> held{false, false, false, false, false};
  static constexpr Method method = Method::exact;

  static physis::quantum::TwoLevel system(const Params& p, double u) { return {p.Omega + u, p.Delta, p.gamma, 0}; }
  static void derivative(const Params& p, const State<n>& x, double u, State<n>& dx) {
    // c' = -i H_eff c, H_eff = [[0, W / 2], [W / 2, -Delta - i gamma / 2]], W = Omega + u.
    const double W = p.Omega + u;
    const std::complex<double> cg(x[0], x[1]), ce(x[2], x[3]), i(0, 1);
    const std::complex<double> dg = -i * (W / 2) * ce, de = -i * ((W / 2) * cg + std::complex<double>(-p.Delta, -p.gamma / 2) * ce);
    dx = {dg.real(), dg.imag(), de.real(), de.imag(), 0};
  }
  static void advance(const Params& p, State<n>& x, double u, double h, const std::array<bool, n>&) {
    const auto c = physis::quantum::apply(physis::quantum::no_jump_propagator(system(p, u), h), {std::complex<double>(x[0], x[1]), std::complex<double>(x[2], x[3])});
    x[0] = c[0].real(); x[1] = c[0].imag(); x[2] = c[1].real(); x[3] = c[1].imag();
  }
  static void receive(const Params&, State<n>& x, std::size_t, double theta) {
    const std::complex<double> cg(x[0], x[1]), ce(x[2], x[3]), mis(0, -std::sin(theta / 2));
    const double co = std::cos(theta / 2);
    const std::complex<double> g = co * cg + mis * ce, e = mis * cg + co * ce;
    x[0] = g.real(); x[1] = g.imag(); x[2] = e.real(); x[3] = e.imag();
  }
  static double norm(const State<n>& x) { return x[0] * x[0] + x[1] * x[1] + x[2] * x[2] + x[3] * x[3]; }
  static void settle(const Params&, State<n>& x) {
    const double N = norm(x), s = 1 / std::sqrt(N);
    for (int c = 0; c < 4; c++) x[c] *= s;
    x[4] -= std::log(N);
  }
  static bool guard(const Params&, const State<n>&) { return false; }
  static double hazard(const Params& p, const State<n>& x) { return p.gamma * (x[2] * x[2] + x[3] * x[3]) / norm(x); }
  static double cumulative_hazard(const Params&, const State<n>& x) { return x[4] - std::log(norm(x)); }
  static void jump(const Params&, State<n>& x) { x = {1, 0, 0, 0, 0}; }
  static double dwell(const Params&) { return 0; }
  static State<n> initial(const Params&) { return {1, 0, 0, 0, 0}; }
};

}  // namespace neuroscience::snn::models
