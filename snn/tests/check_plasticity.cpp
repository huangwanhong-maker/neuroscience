// Checks of plasticity: the lazy, trace-based updates of the engine against the sums over
// pairs (and triplets) of spikes that define the rules, computed here directly from the
// spike times; short-term plasticity against its steady states; and the pruning of the
// postsynaptic history.
//
// Two parrots, pre and post, fire at chosen times; the plastic synapse between them ends on
// post's silent receptor, so that it never makes post fire.

#include <neuroscience/snn/snn.hpp>
#include <calx/verification/check.hpp>

#include <cmath>
#include <string>
#include <vector>

using namespace neuroscience::snn;

namespace {

struct Pair {
  double weight;              // the synapse's weight at the end
  std::vector<double> carried;  // the weight each presynaptic spike carried
  std::size_t history;        // the postsynaptic spikes still kept
};

Pair run(const std::vector<Step>& pre, const std::vector<Step>& post, const Plasticity& rule, double w0, Step delay, double T) {
  const double h = 0.1e-3;
  Network net({h, 1, 1});
  auto& a = net.add<models::Parrot>("pre", 1);
  auto& b = net.add<models::Parrot>("post", 1);
  for (auto [pop, times] : {std::pair{&a, pre}, std::pair{&b, post}}) {
    auto d = std::make_unique<SpikeTimes>();
    d->target = pop;
    d->weight = 1;
    d->times = times;
    net.add_device(std::move(d));
  }
  auto& pr = net.connect(a, b, "silent", Connectivity::all_to_all(), Distribution::constant(w0), Distribution::constant(delay * h), rule);
  auto& rec = net.record_state(b, {0}, {1});
  net.run(T);
  Pair out{pr.parts[0].weight[0], {}, b.history.empty() ? 0 : b.history[0].size()};
  for (std::size_t k = 1; k < rec.values[0].size(); k++)
    if (rec.values[0][k] != rec.values[0][k - 1]) out.carried.push_back(rec.values[0][k] - rec.values[0][k - 1]);
  return out;
}

}  // namespace

int main() {
  calx::verification::Suite s;
  const double h = 0.1e-3;
  const Step d = 10;  // 1 ms
  const std::vector<Step> pre{100, 260, 300, 520, 700, 760, 1100, 1500};
  const std::vector<Step> post{150, 255, 330, 515, 640, 701, 1050, 1180};

  // ---- additive pair STDP: the sum over pairs ------------------------------------------------------------------
  {
    Plasticity r;
    r.rule = Rule::stdp;
    r.lambda = 0.01; r.alpha = 1.1; r.mu_plus = 0; r.mu_minus = 0; r.tau_plus = 20e-3; r.tau_minus = 25e-3; r.w_max = 2.0;
    const double w0 = 1.0;
    const Pair got = run(pre, post, r, w0, d, 0.2);
    // Synapse times: pre at s, post at p + d. Depression for every pair with p + d <= s; potentiation for
    // every pair with s < p + d <= the last presynaptic spike (it is applied at the next presynaptic spike).
    double dw = 0;
    const Step last = pre.back();
    for (Step si : pre)
      for (Step pj : post) {
        const Step q = pj + d;
        if (q <= si) dw -= r.alpha * r.lambda * std::exp(-(si - q) * h / r.tau_minus);
        else if (q <= last) dw += r.lambda * std::exp(-(q - si) * h / r.tau_plus);
      }
    const double want = (w0 / r.w_max + dw) * r.w_max;
    s.check("plasticity: additive STDP equals the sum over all pairs of pre- and postsynaptic spikes", got.weight - want, 2e-6);
    s.require("plasticity: each presynaptic spike carries the weight after its own update", got.carried.size() == pre.size() && std::fabs(got.carried.back() - got.weight) < 1e-6);
  }
  // ---- multiplicative STDP: one pair, then a presynaptic spike that applies it ----------------------------------
  {
    Plasticity r;
    r.rule = Rule::stdp;
    r.lambda = 0.05; r.alpha = 0.8; r.mu_plus = 1; r.mu_minus = 1; r.tau_plus = 20e-3; r.tau_minus = 20e-3; r.w_max = 1.0;
    const double w0 = 0.3;
    const Pair got = run({100, 600}, {200}, r, w0, d, 0.1);
    // At 600: potentiation by the pair (100, 210), w~ += lambda (1 - w~) K+, then depression by (600, 210).
    double w = w0;
    w += r.lambda * (1 - w) * std::exp(-(210 - 100) * h / r.tau_plus);
    w -= r.alpha * r.lambda * w * std::exp(-(600 - 210) * h / r.tau_minus);
    s.check("plasticity: multiplicative STDP (mu = 1) follows Gütig et al.'s weight dependence", got.weight - w, 1e-7);
  }
  // ---- triplet STDP: the sums over pairs and triplets ------------------------------------------------------------
  {
    Plasticity r;
    r.rule = Rule::triplet;
    r.A2_plus = 4e-3; r.A3_plus = 6e-3; r.A2_minus = 5e-3; r.A3_minus = 2e-3;
    r.triplet_tau_plus = 16.8e-3; r.triplet_tau_minus = 33.7e-3; r.tau_x = 101e-3; r.tau_y = 125e-3; r.w_max = 1.0;
    const double w0 = 0.5;
    const Pair got = run(pre, post, r, w0, d, 0.2);
    const Step last = pre.back();
    double dw = 0;
    for (Step pj : post) {
      const Step q = pj + d;
      if (q > last) continue;
      double r1 = 0, o2 = 0;
      for (Step si : pre) if (si < q) r1 += std::exp(-(q - si) * h / r.triplet_tau_plus);
      for (Step pk : post) if (pk + d < q) o2 += std::exp(-(q - pk - d) * h / r.tau_y);
      dw += r1 * (r.A2_plus + r.A3_plus * o2);
    }
    for (Step si : pre) {
      double o1 = 0, r2 = 0;
      for (Step pj : post) if (pj + d <= si) o1 += std::exp(-(si - pj - d) * h / r.triplet_tau_minus);
      for (Step sk : pre) if (sk < si) r2 += std::exp(-(si - sk) * h / r.tau_x);
      dw -= o1 * (r.A2_minus + r.A3_minus * r2);
    }
    s.check("plasticity: triplet STDP equals Pfister and Gerstner's sums over pairs and triplets", got.weight - (w0 + dw * r.w_max), 2e-6);
  }
  // ---- the postsynaptic history is pruned once every plastic synapse has used it ------------------------------------
  {
    Plasticity r;
    r.rule = Rule::stdp;
    r.w_max = 1;
    std::vector<Step> many_pre, many_post;
    for (Step k = 0; k < 400; k++) { many_pre.push_back(100 + 50 * k); many_post.push_back(120 + 50 * k); }
    const Pair got = run(many_pre, many_post, r, 0.5, d, 2.2);
    s.require("plasticity: of 400 postsynaptic spikes, those every plastic synapse has used are dropped", got.history <= 2, std::to_string(got.history) + " kept");
  }
  // ---- short-term plasticity: depression and facilitation at their steady states --------------------------------------
  {
    std::vector<Step> train;
    for (Step k = 0; k < 40; k++) train.push_back(100 + 500 * k);  // 20 Hz
    const double D = 500 * h;
    Plasticity dep;
    dep.rule = Rule::tsodyks;
    dep.U = 0.5; dep.tau_rec = 800e-3; dep.tau_fac = 0;
    const Pair a = run(train, {}, dep, 1.0, d, 2.2);
    // x* = (1 - e^{-D/tau_rec}) / (1 - (1 - U) e^{-D/tau_rec}); the amplitude w U x*.
    const double e = std::exp(-D / dep.tau_rec), xs = (1 - e) / (1 - (1 - dep.U) * e);
    s.check("plasticity: a depressing synapse carries w U at its first spike", a.carried.empty() ? 1 : a.carried.front() - dep.U, 1e-6);
    s.check("plasticity: a depressing synapse settles at w U x*, x* = (1 - e^{-D/tau}) / (1 - (1 - U) e^{-D/tau})",
            a.carried.empty() ? 1 : a.carried.back() - dep.U * xs, 1e-6);
    Plasticity fac;
    fac.rule = Rule::tsodyks;
    fac.U = 0.1; fac.tau_rec = 1e-3; fac.tau_fac = 500e-3;
    // u converges geometrically, by (1 - U) e^{-D/tau_fac} = 0.81 a spike: 120 spikes bring it within 1e-10.
    std::vector<Step> long_train;
    for (Step k = 0; k < 120; k++) long_train.push_back(100 + 500 * k);
    const Pair b = run(long_train, {}, fac, 1.0, d, 6.1);
    // u* = U / (1 - (1 - U) e^{-D/tau_fac}); x* = (1 - e^{-D/tau_rec}) / (1 - (1 - u*) e^{-D/tau_rec}) ~ 1.
    const double ef = std::exp(-D / fac.tau_fac), us = fac.U / (1 - (1 - fac.U) * ef);
    const double er = std::exp(-D / fac.tau_rec), xf = (1 - er) / (1 - (1 - us) * er);
    s.check("plasticity: a facilitating synapse settles at w u* x*, u* = U / (1 - (1 - U) e^{-D/tau_fac})",
            b.carried.empty() ? 1 : b.carried.back() - us * xf, 1e-6);
  }
  return s.done();
}
