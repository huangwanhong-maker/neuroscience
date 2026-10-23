// Synapses: the weight a presynaptic spike carries to its target, and how it changes.
//
// Timing (as NEST takes it; Morrison, Diesmann and Gerstner 2008, Biol. Cybern. 98,
// 459-478, §4): a synapse with delay d sees its presynaptic spike at the spike's time s
// and a postsynaptic spike at p + d, the delay standing for the dendrite's back-propagation.
// A pair contributes once: potentiation when p + d > s, depression when p + d <= s. When the
// spike s is delivered, every postsynaptic spike with p + d <= s has happened (d >= h), so the
// synapse is updated then, lazily: the postsynaptic spikes since its last presynaptic one
// potentiate it, the present one depresses it, and the spike carries the new weight.
//
// Rules, each with its own state per synapse:
// - static: the weight.
// - stdp: pair-based, all-to-all, with Gütig et al.'s weight dependence on w~ = w / w_max:
//   potentiation w~ += lambda (1 - w~)^mu_plus K+, depression w~ -= alpha lambda w~^mu_minus K-,
//   K+ and K- the traces of the pre- and postsynaptic spikes with tau_plus and tau_minus
//   (Song, Miller and Abbott 2000 for mu = 0, additive; van Rossum, Bi and Turrigiano 2000
//   for mu = 1, multiplicative; Gütig, Aharonov, Rotter and Sompolinsky 2003, J. Neurosci. 23,
//   3697-3714, between). State: the presynaptic trace after the last presynaptic spike, the
//   postsynaptic trace at that time, and that time.
// - triplet: Pfister and Gerstner 2006 (J. Neurosci. 26, 9673-9682), all-to-all:
//   at a postsynaptic spike w += w_max r1 (A2+ + A3+ o2), at a presynaptic one
//   w -= w_max o1 (A2- + A3- r2), the triplet traces read just before their own increments;
//   r1, r2 presynaptic traces (tau_plus, tau_x), o1, o2 postsynaptic (tau_minus, tau_y).
// - tsodyks: short-term depression and facilitation (Tsodyks and Markram 1997, PNAS 94,
//   719-723; Markram, Wang and Tsodyks 1998, PNAS 95, 5323-5328): spike n carries
//   w u_n x_n, with u_{n+1} = U + u_n (1 - U) e^{-Delta/tau_fac} and
//   x_{n+1} = 1 + (x_n - u_n x_n - 1) e^{-Delta/tau_rec}, u_1 = U, x_1 = 1.
//
// Weights are stored in single precision (declared: `Weight`); traces and the state of
// short-term plasticity in double.

#pragma once

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <deque>
#include <string_view>
#include <vector>

#include "population.hpp"

namespace neuroscience::snn {

using Weight = float;

enum class Rule { static_weight, stdp, triplet, tsodyks };

inline std::string_view rule_name(Rule r) {
  switch (r) {
    case Rule::static_weight: return "static";
    case Rule::stdp: return "stdp";
    case Rule::triplet: return "triplet";
    case Rule::tsodyks: return "tsodyks";
  }
  return "?";
}

struct Plasticity {
  Rule rule = Rule::static_weight;
  // stdp
  double lambda = 0.01, alpha = 1.0, mu_plus = 0.0, mu_minus = 0.0;
  double tau_plus = 20e-3, tau_minus = 20e-3;
  // triplet (time constants of Bi and Poo 1998 and Pfister and Gerstner 2006's visual cortex fit)
  double A2_plus = 5e-3, A3_plus = 6.2e-3, A2_minus = 7e-3, A3_minus = 2.3e-4;
  double tau_x = 101e-3, tau_y = 125e-3, triplet_tau_plus = 16.8e-3, triplet_tau_minus = 33.7e-3;
  // the bound of plastic weights (in the weight's units; plastic weights lie in [0, w_max])
  double w_max = 0;
  // tsodyks
  double U = 0.5, tau_rec = 800e-3, tau_fac = 0.0;

  bool plastic() const { return rule == Rule::stdp || rule == Rule::triplet; }
};

// The synapses of one projection that one thread owns, by rows of presynaptic neurons.
struct SynapseRows {
  std::vector<std::uint64_t> row;   // n_source + 1
  std::vector<std::uint32_t> target;
  std::vector<Weight> weight;
  std::vector<std::uint16_t> delay;  // in steps
  // state of the rule (meaning by rule): stdp a = K+, b = K-; triplet a = r1, b = r2, c = o1,
  // e = o2; tsodyks a = u, b = x.
  std::vector<double> a, b, c, e;
  std::vector<Step> last;  // the time of the last presynaptic spike (-1: none)

  void allocate_state(Rule r) {
    const std::size_t n = target.size();
    if (r == Rule::static_weight) return;
    a.assign(n, 0); b.assign(n, 0); last.assign(n, -1);
    if (r == Rule::triplet) { c.assign(n, 0); e.assign(n, 0); }
  }
};

namespace detail {

inline double facilitate(double w, double K, const Plasticity& p) {
  return std::min(1.0, w + p.lambda * std::pow(1 - w, p.mu_plus) * K);
}
inline double depress(double w, double K, const Plasticity& p) {
  return std::max(0.0, w - p.alpha * p.lambda * std::pow(w, p.mu_minus) * K);
}

}  // namespace detail

// The weight that the spike at time s carries through synapse k, updating its state.
// `post` is the history of the target's spikes; each used spike is counted.
inline double transmit(SynapseRows& q, std::size_t k, Step s, double h, const Plasticity& p, std::deque<PostSpike>* post) {
  switch (p.rule) {
    case Rule::static_weight: return q.weight[k];

    case Rule::stdp: {
      const Step last = q.last[k];
      const Step d = q.delay[k];
      double w = q.weight[k] / p.w_max, x = q.a[k], y = q.b[k];
      Step t = last < 0 ? 0 : last;  // the time at which y is known
      if (post)
        for (auto& e : *post) {
          const Step qt = e.time + d;
          if (qt <= last) continue;
          if (qt > s) break;
          if (last >= 0) w = detail::facilitate(w, x * std::exp(-(qt - last) * h / p.tau_plus), p);
          y = y * std::exp(-(qt - t) * h / p.tau_minus) + 1;
          t = qt;
          e.used++;
        }
      y *= std::exp(-(s - t) * h / p.tau_minus);
      w = detail::depress(w, y, p);
      q.a[k] = (last >= 0 ? x * std::exp(-(s - last) * h / p.tau_plus) : 0.0) + 1;
      q.b[k] = y;
      q.last[k] = s;
      q.weight[k] = static_cast<Weight>(w * p.w_max);
      return q.weight[k];
    }

    case Rule::triplet: {
      const Step last = q.last[k];
      const Step d = q.delay[k];
      double w = q.weight[k], r1 = q.a[k], r2 = q.b[k], o1 = q.c[k], o2 = q.e[k];
      Step t = last < 0 ? 0 : last;
      const double tp = p.triplet_tau_plus, tm = p.triplet_tau_minus;
      if (post)
        for (auto& e : *post) {
          const Step qt = e.time + d;
          if (qt <= last) continue;
          if (qt > s) break;
          o1 *= std::exp(-(qt - t) * h / tm);
          o2 *= std::exp(-(qt - t) * h / p.tau_y);
          if (last >= 0) w = std::min(p.w_max, w + p.w_max * r1 * std::exp(-(qt - last) * h / tp) * (p.A2_plus + p.A3_plus * o2));
          o1 += 1;
          o2 += 1;
          t = qt;
          e.used++;
        }
      o1 *= std::exp(-(s - t) * h / tm);
      o2 *= std::exp(-(s - t) * h / p.tau_y);
      const double r2s = last >= 0 ? r2 * std::exp(-(s - last) * h / p.tau_x) : 0.0;
      w = std::max(0.0, w - p.w_max * o1 * (p.A2_minus + p.A3_minus * r2s));
      q.a[k] = (last >= 0 ? r1 * std::exp(-(s - last) * h / tp) : 0.0) + 1;
      q.b[k] = r2s + 1;
      q.c[k] = o1;
      q.e[k] = o2;
      q.last[k] = s;
      q.weight[k] = static_cast<Weight>(w);
      return w;
    }

    case Rule::tsodyks: {
      double u, x;
      if (q.last[k] < 0) {
        u = p.U;
        x = 1;
      } else {
        const double D = (s - q.last[k]) * h;
        const double u_old = q.a[k], x_old = q.b[k];
        x = 1 + (x_old - u_old * x_old - 1) * std::exp(-D / p.tau_rec);
        u = p.tau_fac > 0 ? p.U + u_old * (1 - p.U) * std::exp(-D / p.tau_fac) : p.U;
      }
      q.a[k] = u;
      q.b[k] = x;
      q.last[k] = s;
      return q.weight[k] * u * x;
    }
  }
  return q.weight[k];
}

}  // namespace neuroscience::snn
