// Checks of the neuron models, each as a population of the network (the engine's own
// loop), against closed forms, against physis's simulation of the same system, and against
// the firing patterns their papers describe.

#include <neuroscience/snn/snn.hpp>
#include <calx/verification/check.hpp>

#include <algorithm>
#include <cmath>
#include <numeric>
#include <string>
#include <vector>

using namespace neuroscience::snn;
namespace u = physis::units::unit;
using calx::verification::relative;

namespace {

// The spike times (in seconds) of neuron 0 of a one-neuron population of model M driven by a
// constant current I for T seconds.
template <class M>
std::vector<double> spikes_under(const typename M::Params& p, double I, double T, double h = 0.1e-3) {
  Network net({h, 1, 1});
  auto& pop = net.add<M>("n", 1, p);
  auto d = std::make_unique<CurrentInput>();
  d->target = &pop;
  d->amplitude = I;
  net.add_device(std::move(d));
  auto& rec = net.record_spikes(pop);
  net.run(T);
  std::vector<double> t;
  for (const auto& s : rec.spikes) t.push_back(s.time * h);
  return t;
}

std::vector<double> intervals(const std::vector<double>& t) {
  std::vector<double> d;
  for (std::size_t i = 1; i < t.size(); i++) d.push_back(t[i] - t[i - 1]);
  return d;
}

}  // namespace

int main() {
  calx::verification::Suite s;
  const double h = 0.1e-3;

  // ---- lif_psc_exp: the postsynaptic potential of one spike, against its closed form -----------------------
  {
    models::LifPscExp::Params p;
    Network net({h, 1, 1});
    auto& pop = net.add<models::LifPscExp>("n", 1, p);
    auto src = std::make_unique<SpikeTimes>();
    src->target = &pop;
    src->receptor = pop.receptor("excitatory");
    src->weight = 100 * u::pA;
    src->times = {100};  // arrives at t = 10 ms
    net.add_device(std::move(src));
    auto& rec = net.record_state(pop, {0}, {0});
    net.run(0.1);
    // V - E_L = w tau_s tau_m / (C (tau_m - tau_s)) (e^{-t/tau_m} - e^{-t/tau_s}) after the arrival.
    double worst = 0, peak = 0;
    for (std::size_t k = 0; k < rec.times.size(); k++) {
      const double t = (rec.times[k] - 100) * h;
      const double want = t <= 0 ? 0 : 100e-12 * p.tau_syn_ex * p.tau_m / (p.C_m * (p.tau_m - p.tau_syn_ex)) * (std::exp(-t / p.tau_m) - std::exp(-t / p.tau_syn_ex));
      worst = std::max(worst, std::fabs(rec.values[0][k] - p.E_L - want));
      peak = std::max(peak, want);
    }
    // The potential is stored absolutely, near -70 mV, whose last digit is 1.4e-17 V: a thousand
    // steps of rounding come to some 1e-16 V, about 1e-12 of this potential's peak of 0.1 mV.
    s.check("models: lif_psc_exp's postsynaptic potential against its closed form, relative to its peak", worst / peak, 2e-11);
  }
  // ---- lif_psc_alpha: the current of one spike peaks at its weight, tau after it --------------------------------
  {
    models::LifPscAlpha::Params p;
    Network net({h, 1, 1});
    auto& pop = net.add<models::LifPscAlpha>("n", 1, p);
    auto src = std::make_unique<SpikeTimes>();
    src->target = &pop;
    src->receptor = pop.receptor("excitatory");
    src->weight = 50 * u::pA;
    src->times = {10};
    net.add_device(std::move(src));
    auto& rec = net.record_state(pop, {0}, {pop.component("I_ex")});
    net.run(0.02);
    double worst = 0;
    for (std::size_t k = 0; k < rec.times.size(); k++) {
      const double t = (rec.times[k] - 10) * h;
      const double want = t <= 0 ? 0 : 50e-12 * std::numbers::e / p.tau_syn_ex * t * std::exp(-t / p.tau_syn_ex);
      worst = std::max(worst, std::fabs(rec.values[0][k] - want));
    }
    s.check("models: lif_psc_alpha's current is w (e / tau) t e^{-t / tau}, relative to w", worst / 50e-12, 1e-12);
  }
  // ---- lif_psc_delta: the period under a constant current, on the grid ----------------------------------------
  {
    models::LifPscDelta::Params p;
    const double I = 400 * u::pA, T = 1.0;
    const auto t = spikes_under<models::LifPscDelta>(p, I, T, h);
    // V(t) = E_L + R I (1 - e^{-t / tau}) from V_reset = E_L: the first grid point with V >= V_th, then t_ref held.
    const double R = p.tau_m / p.C_m;
    long long k = 1;
    while (p.E_L + R * I * (1 - std::exp(-k * h / p.tau_m)) < p.V_th) k++;
    const long long period = k + std::llround(p.t_ref / h);
    bool regular = !t.empty() && std::llround(t[0] / h) == k;
    for (std::size_t i = 1; i < t.size(); i++) regular &= std::llround((t[i] - t[i - 1]) / h) == period;
    s.require("models: lif_psc_delta fires on the grid where its closed form first reaches threshold, then every t_ref later",
              regular && t.size() == static_cast<std::size_t>((std::llround(T / h) - k) / period + 1),
              std::to_string(t.size()) + " spikes, period " + std::to_string(period) + " steps");
  }
  // ---- a population agrees with physis's simulation of the same system ------------------------------------------
  {
    models::Adex::Params p;
    const double I = 1200 * u::pA;
    const auto a = spikes_under<models::Adex>(p, I, 0.5, h);
    const pd::Stepping how{pd::Method::dopri5, 1, {1e-6, 1e-6}};
    const auto tr = pd::simulate<models::Adex>(p, models::Adex::initial(p), [&](double) { return I; }, 0.5, h, how, 0, models::Adex::scale);
    bool same = a.size() == tr.events.size() && !a.empty();
    for (std::size_t i = 0; same && i < a.size(); i++) same &= std::fabs(a[i] - tr.events[i]) < 0.5 * h;
    s.require("models: an adex population and physis's simulation of one adex neuron fire at the same steps", same && a.size() > 5,
              std::to_string(a.size()) + " and " + std::to_string(tr.events.size()) + " spikes");
  }
  // ---- adex: the firing patterns of Naud, Marcille, Clopath and Gerstner 2008, Table 1 ----------------------------
  {
    auto naud = [&](double C, double gL, double EL, double VT, double a, double tw, double b, double Vr, double I) {
      models::Adex::Params p;
      p.C_m = C * u::pF; p.g_L = gL * u::nS; p.E_L = EL * u::mV; p.V_T = VT * u::mV; p.Delta_T = 2 * u::mV;
      p.a = a * u::nS; p.tau_w = tw * u::ms; p.b = b * u::pA; p.V_reset = Vr * u::mV; p.V_peak = 0;
      // Two seconds: adaptation with tau_w = 300 ms settles within it.
      return intervals(spikes_under<models::Adex>(p, I * u::pA, 2.0, h));
    };
    const auto tonic = naud(200, 10, -70, -50, 2, 30, 0, -58, 500);
    const auto adapt = naud(200, 12, -70, -50, 2, 300, 60, -58, 500);
    const auto burst = naud(130, 18, -58, -50, 4, 150, 120, -50, 400);
    const auto regular = naud(200, 10, -58, -50, 2, 120, 100, -46, 210);
    auto cv = [](const std::vector<double>& d, std::size_t from) {
      std::vector<double> x(d.begin() + std::min(from, d.size()), d.end());
      if (x.size() < 2) return 1e9;
      const double m = std::accumulate(x.begin(), x.end(), 0.0) / x.size();
      double v = 0;
      for (double y : x) v += (y - m) * (y - m);
      return std::sqrt(v / (x.size() - 1)) / m;
    };
    s.require("models: adex tonic spiking (Naud 2008): regular intervals from the first", tonic.size() > 10 && cv(tonic, 1) < 0.02 && tonic[0] / tonic.back() > 0.8,
              std::to_string(tonic.size() + 1) + " spikes");
    s.require("models: adex adaptation: intervals lengthen, at least threefold, then settle", adapt.size() > 3 && adapt.back() / adapt.front() > 3 && cv(adapt, adapt.size() / 2) < 0.05,
              calx::verification::shortest(adapt.empty() ? 0 : adapt.back() / adapt.front()) + "-fold");
    // An initial burst: short intervals first, then regular spikes at much longer intervals.
    s.require("models: adex initial burst: a few short intervals, then regular long ones",
              burst.size() > 4 && burst[0] * 3 < burst.back() && cv(burst, 3) < 0.05,
              std::to_string(burst.size() + 1) + " spikes; first " + calx::verification::shortest(burst.empty() ? 0 : burst[0] * 1e3) + " ms");
    // Regular bursting: the intervals fall in two groups, short within bursts and long between them, repeatedly.
    std::size_t longs = 0, shorts = 0;
    if (!regular.empty()) {
      const double mx = *std::max_element(regular.begin(), regular.end());
      for (double d : regular) (d > 0.5 * mx ? longs : shorts)++;
    }
    s.require("models: adex regular bursting: short intervals within bursts and long ones between, repeatedly", longs >= 5 && shorts >= longs,
              std::to_string(longs) + " long and " + std::to_string(shorts) + " short intervals");
  }
  // ---- izhikevich: regular spiking, fast spiking and chattering (Izhikevich 2003, Fig. 2) -------------------------
  {
    auto izh = [&](double a, double b, double c, double d) {
      models::Izhikevich::Params p;
      p.a = a * 1e3;  // per ms to per s
      p.b = b * 1e3;
      p.c = c * u::mV;
      p.d = d;        // in mV/ms, which is V/s
      return intervals(spikes_under<models::Izhikevich>(p, 10 * u::pA, 1.0, h));
    };
    const auto rs = izh(0.02, 0.2, -65, 8), fs = izh(0.1, 0.2, -65, 2), ch = izh(0.02, 0.2, -50, 2);
    s.require("models: izhikevich regular spiking adapts: its intervals lengthen", rs.size() > 3 && rs.back() > 1.5 * rs.front());
    // Fast spiking settles, after a transient of a few spikes, to intervals that do not lengthen: on
    // the grid each is a whole number of steps and jitters by a few, so the means of the second
    // and the last quarters are compared.
    auto mean_of = [](const std::vector<double>& d, std::size_t a, std::size_t b) { return std::accumulate(d.begin() + a, d.begin() + b, 0.0) / (b - a); };
    const std::size_t q = fs.size() / 4;
    const double drift = q ? mean_of(fs, 3 * q, fs.size()) - mean_of(fs, q, 2 * q) : 1;
    s.require("models: izhikevich fast spiking fires faster than regular spiking, and settles without adaptation",
              fs.size() > 2 * rs.size() && std::fabs(drift) < h, std::to_string(fs.size() + 1) + " against " + std::to_string(rs.size() + 1) + " spikes");
    std::size_t longs = 0, shorts = 0;
    if (!ch.empty()) {
      const double mx = *std::max_element(ch.begin(), ch.end());
      for (double d : ch) (d > 0.5 * mx ? longs : shorts)++;
    }
    s.require("models: izhikevich chattering fires in bursts", longs >= 3 && shorts >= longs, std::to_string(longs) + " bursts");
  }
  // ---- hodgkin_huxley -------------------------------------------------------------------------------------------
  {
    models::HodgkinHuxley::Params p;
    // At rest (no input) it stays near -65 mV, the resting potential its E_L was chosen to give.
    Network net({h, 1, 1});
    auto& pop = net.add<models::HodgkinHuxley>("n", 1, p);
    net.run(0.2);
    s.check("models: hodgkin_huxley rests at -65 mV (deviation)", pop.get(0, 0) + 65e-3, 0.2e-3, "V");
    // 10 uA/cm^2 on 100 pF (1 uF/cm^2) is 1000 pA: repetitive firing; two integrators agree.
    const auto a = spikes_under<models::HodgkinHuxley>(p, 1000 * u::pA, 1.0, 0.01e-3);
    Network n2({0.01e-3, 1, 1, {pd::Method::rk4, 1, {}}});
    auto& p2 = n2.add<models::HodgkinHuxley>("n", 1, p);
    auto d2 = std::make_unique<CurrentInput>();
    d2->target = &p2;
    d2->amplitude = 1000 * u::pA;
    n2.add_device(std::move(d2));
    auto& r2 = n2.record_spikes(p2);
    n2.run(1.0);
    const double rate = static_cast<double>(a.size());
    s.require("models: hodgkin_huxley fires repetitively at 10 uA/cm^2, between 50 and 100 Hz", rate > 50 && rate < 100, calx::verification::shortest(rate) + " Hz");
    s.require("models: hodgkin_huxley by Dormand-Prince and by RK4 at 10 us agree on every spike to 0.1 ms",
              a.size() == r2.spikes.size() && std::fabs(a.back() - r2.spikes.back().time * 0.01e-3) < 0.1e-3,
              std::to_string(a.size()) + " and " + std::to_string(r2.spikes.size()) + " spikes");
    // Peaks above +30 mV.
    Network n3({0.01e-3, 1, 1});
    auto& p3 = n3.add<models::HodgkinHuxley>("n", 1, p);
    auto d3 = std::make_unique<CurrentInput>();
    d3->target = &p3;
    d3->amplitude = 1000 * u::pA;
    n3.add_device(std::move(d3));
    auto& r3 = n3.record_state(p3, {0}, {0});
    n3.run(0.05);
    const double vmax = *std::max_element(r3.values[0].begin(), r3.values[0].end());
    s.require("models: hodgkin_huxley's spikes overshoot above +30 mV", vmax > 30e-3, calx::verification::shortest(vmax * 1e3) + " mV");
  }
  // ---- qif: the exact flow gives the period of the closed form ----------------------------------------------------
  {
    models::Qif::Params p;
    p.eta = 4;
    const auto t = spikes_under<models::Qif>(p, 0, 0.5, h);
    // From -100 to 100: (2 tau / sqrt(eta)) atan(100 / sqrt(eta)), then t_ref held.
    const double T = 2 * p.tau / std::sqrt(p.eta) * std::atan(p.v_peak / std::sqrt(p.eta)) + p.t_ref;
    const auto d = intervals(t);
    double worst = 0;
    for (double x : d) worst = std::max(worst, std::fabs(x - T));
    s.check("models: qif's intervals equal the closed-form period, to within the step", worst, 1.0001 * h, "s");
  }
  // ---- resonate_and_fire: the response to a pulse is e^{bt} sin(wt) -----------------------------------------------
  {
    models::ResonateAndFire::Params p;
    p.threshold = 1;  // never reached
    Network net({h, 1, 1});
    auto& pop = net.add<models::ResonateAndFire>("n", 1, p);
    auto src = std::make_unique<SpikeTimes>();
    src->target = &pop;
    src->weight = 1e-3;
    src->times = {1};
    net.add_device(std::move(src));
    auto& rec = net.record_state(pop, {0}, {1});
    net.run(0.2);
    const double b = -1 / p.tau, w = 2 * std::numbers::pi * p.frequency;
    double worst = 0;
    for (std::size_t k = 0; k < rec.times.size(); k++) {
      const double t = (rec.times[k] - 1) * h;
      worst = std::max(worst, std::fabs(rec.values[0][k] - (t <= 0 ? 0 : 1e-3 * std::exp(b * t) * std::sin(w * t))));
    }
    s.check("models: resonate_and_fire's response to a pulse is w e^{bt} sin(omega t), relative to w", worst / 1e-3, 1e-12);
  }
  // ---- glif, mat2, alif: their thresholds after a spike --------------------------------------------------------------
  {
    models::Glif::Params p;
    p.delta_theta_s = 2 * u::mV;
    p.A_1 = -10 * u::pA;
    Network net({h, 1, 1});
    auto& pop = net.add<models::Glif>("n", 1, p);
    auto src = std::make_unique<SpikeTimes>();
    src->target = &pop;
    src->receptor = pop.receptor("excitatory");
    src->weight = 20e-9;  // a large current: one spike, at once
    src->times = {10};
    net.add_device(std::move(src));
    auto& rec = net.record_state(pop, {0}, {pop.component("theta_s"), pop.component("I_1")});
    auto& sp = net.record_spikes(pop);
    net.run(0.1);
    double worst = 0;
    if (!sp.spikes.empty()) {
      const Step t0 = sp.spikes[0].time;
      for (std::size_t k = 0; k < rec.times.size(); k++) {
        if (rec.times[k] < t0 || (sp.spikes.size() > 1 && rec.times[k] >= sp.spikes[1].time)) continue;
        const double t = (rec.times[k] - t0) * h;
        worst = std::max({worst, std::fabs(rec.values[0][2 * k] - 2e-3 * std::exp(-p.b_s * t)) / 2e-3,
                          std::fabs(rec.values[0][2 * k + 1] + 10e-12 * std::exp(-p.k_1 * t)) / 10e-12});
      }
    }
    s.check("models: glif's spike-triggered threshold and after-spike current decay as their closed forms", sp.spikes.empty() ? 1.0 : worst, 1e-12);
  }
  // ---- lif_escape: at a fixed potential it fires as a Poisson process at rho ----------------------------------------
  {
    models::LifEscape::Params p;
    p.E_L = p.V_th;  // rest at the soft threshold: the rate is rho_0
    p.V_reset = p.V_th;
    p.t_ref = 0;
    const std::size_t N = 2000;
    Network net({h, 7, 4});
    auto& pop = net.add<models::LifEscape>("n", N, p);
    auto& rec = net.record_spikes(pop);
    net.run(1.0);
    const double prob = -std::expm1(-p.rho_0 * h), steps = 1.0 / h;
    const double mean = steps * prob * N, sd = std::sqrt(steps * prob * (1 - prob) * N);
    s.check("models: lif_escape at its threshold fires with probability 1 - e^{-rho h} per step (z of the count)",
            (static_cast<double>(rec.spikes.size()) - mean) / sd, 5);
  }
  // ---- lif_cond_exp: Dormand-Prince against a fine reference --------------------------------------------------------
  {
    models::LifCondExp::Params p;
    auto trace = [&](double hh, pd::Method m) {
      Network net({hh, 1, 1, {m, 1, {1e-9, 1e-9}}});
      auto& pop = net.add<models::LifCondExp>("n", 1, p);
      auto src = std::make_unique<SpikeTimes>();
      src->target = &pop;
      src->receptor = pop.receptor("excitatory");
      src->weight = 5 * u::nS;
      src->times = {static_cast<Step>(std::llround(5e-3 / hh))};
      net.add_device(std::move(src));
      auto& rec = net.record_state(pop, {0}, {0}, static_cast<std::int64_t>(std::llround(1e-3 / hh)));
      net.run(0.03);
      return rec.values[0];
    };
    const auto coarse = trace(0.1e-3, pd::Method::dopri5), fine = trace(0.001e-3, pd::Method::rk4);
    s.check("models: lif_cond_exp by Dormand-Prince at 0.1 ms against RK4 at 1 us, sampled each ms", calx::verification::max_difference(coarse, fine), 1e-7, "V");
  }
  return s.done();
}
