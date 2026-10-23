// Checks of the models of excitability against the bifurcations that define their classes
// (Hodgkin 1948; Rinzel and Ermentrout 1998): where the resting state is lost, computed from
// the model's equations alone, and how the firing begins there.
//
// - Class 1 (izhikevich_2007, wang_buzsaki, morris_lecar with the SNIC parameters): the
//   resting state meets a saddle where the steady-state current I_ss(V) = I_ion(V, x_inf(V))
//   has its first local maximum, I_SN; the firing begins there, and its period diverges as
//   (I - I_SN)^{-1/2}, so that four times the excess current halves the period.
// - Class 2 (morris_lecar with the Hopf parameters, fitzhugh_nagumo): the resting state loses
//   its stability where the trace of the Jacobian vanishes along the branch of equilibria,
//   I_H; a small perturbation of the resting state decays below I_H and grows into firing
//   above it, and the firing begins at a rate bounded away from zero.

#include <neuroscience/snn/snn.hpp>
#include <calx/solvers/roots.hpp>
#include <calx/verification/check.hpp>

#include <algorithm>
#include <cmath>
#include <functional>
#include <string>
#include <vector>

using namespace neuroscience::snn;
namespace u = physis::units::unit;
using calx::verification::shortest;

namespace {

// The spike times (s) of one neuron of model M under a constant current I for T seconds,
// started at its resting state for I_e and kicked at 10 ms by `kick` on receptor 0.
template <class M>
std::vector<double> spikes(const typename M::Params& p, double I, double T, double h, double kick = 0) {
  Network net({h, 1, 1});
  auto& pop = net.add<M>("n", 1, p);
  if (I != 0) {
    auto d = std::make_unique<CurrentInput>();
    d->target = &pop;
    d->amplitude = I;
    net.add_device(std::move(d));
  }
  if (kick != 0) {
    auto k = std::make_unique<SpikeTimes>();
    k->target = &pop;
    k->weight = kick;
    k->times = {static_cast<Step>(std::llround(10e-3 / h))};
    net.add_device(std::move(k));
  }
  auto& rec = net.record_spikes(pop);
  net.run(T);
  std::vector<double> t;
  for (const auto& s : rec.spikes) t.push_back(s.time * h);
  return t;
}

// The number of spikes in the second half of [0, T]: repetitive firing, not a transient.
int late(const std::vector<double>& t, double T) {
  return static_cast<int>(std::count_if(t.begin(), t.end(), [&](double x) { return x > T / 2; }));
}

// The last interval: the period of repetitive firing (0 if fewer than three spikes).
double period(const std::vector<double>& t) { return t.size() < 3 ? 0 : t[t.size() - 1] - t[t.size() - 2]; }

// The first local maximum of f on [lo, hi], scanned in steps of `step`.
double first_maximum(const std::function<double(double)>& f, double lo, double hi, double step) {
  double best = f(lo);
  for (double v = lo + step; v <= hi; v += step) {
    const double y = f(v);
    if (y < best) return best;
    best = y;
  }
  return best;
}

// The current at which the trace of the 2x2 Jacobian of (V, w) vanishes first along the branch
// of equilibria (V, w_inf(V)) above V_lo: the Hopf bifurcation of a planar model. `state(V)`
// gives the equilibrium at V, `current(V)` the constant input that holds it there, and the
// Jacobian is taken by central differences of the model's own derivative.
template <class M>
double hopf_current(typename M::Params p, const std::function<State<M::n>(double)>& state, const std::function<double(double)>& current,
                    double V_lo, double V_hi, int steps, double dV) {
  auto trace = [&](double V) {
    p.I_e = current(V);
    State<M::n> x = state(V), dx_plus, dx_minus;
    double tr = 0;
    for (int j = 0; j < 2; j++) {
      const double d = dV * M::scale[j];
      State<M::n> a = x, b = x;
      a[j] += d;
      b[j] -= d;
      M::derivative(p, a, 0, dx_plus);
      M::derivative(p, b, 0, dx_minus);
      tr += (dx_plus[j] - dx_minus[j]) / (2 * d);
    }
    return tr;
  };
  double a = V_lo, ta = trace(a);
  for (int i = 1; i <= steps; i++) {
    const double b = V_lo + (V_hi - V_lo) * i / steps, tb = trace(b);
    if ((ta > 0) != (tb > 0)) return current(calx::solvers::brent(trace, a, b, 0).x);
    a = b;
    ta = tb;
  }
  return std::nan("");
}

}  // namespace

int main() {
  calx::verification::Suite s;

  // ---- izhikevich_2007: firing begins at the rheobase of the closed form -----------------------------------------
  {
    using M = models::Izhikevich2007;
    const M::Params p;
    const double rh = std::pow(p.k * (p.V_t - p.V_r) + p.b, 2) / (4 * p.k), T = 6, h = 0.1e-3;
    const int below = late(spikes<M>(p, 0.998 * rh, T, h), T), above = late(spikes<M>(p, 1.002 * rh, T, h), T);
    s.require("excitability: izhikevich_2007 is silent 0.2% below its rheobase (k (V_t - V_r) + b)^2 / 4k and fires 0.2% above it",
              below == 0 && above >= 2, shortest(rh * 1e12) + " pA; " + std::to_string(below) + " and " + std::to_string(above) + " late spikes");
    const double t1 = period(spikes<M>(p, 1.005 * rh, 12, h)), t4 = period(spikes<M>(p, 1.02 * rh, 12, h));
    s.check("excitability: izhikevich_2007 is class 1: four times the excess current halves the period (ratio - 2)", t1 / t4 - 2, 0.1);
  }
  // ---- wang_buzsaki: class 1, firing from the saddle-node of the steady-state current -----------------------------
  {
    using M = models::WangBuzsaki;
    const M::Params p;
    auto I_ss = [&](double V) {
      const auto r = M::rates(V);
      return M::ionic(p, V, r[2] / (r[2] + r[3]), r[4] / (r[4] + r[5]));
    };
    const State<M::n> x0 = M::initial(p);
    State<M::n> dx;
    M::derivative(p, x0, 0, dx);
    s.check("excitability: wang_buzsaki starts at rest (|V'| at its initial state)", std::fabs(dx[0]), 1e-9, "V/s");
    const double I_sn = first_maximum(I_ss, x0[0], -40e-3, 1e-6), T = 6, h = 0.05e-3;
    const int below = late(spikes<M>(p, 0.998 * I_sn, T, h), T), above = late(spikes<M>(p, 1.002 * I_sn, T, h), T);
    s.require("excitability: wang_buzsaki is silent 0.2% below the saddle-node of its steady-state current and fires 0.2% above it",
              below == 0 && above >= 2, shortest(I_sn * 1e12) + " pA (" + shortest(I_sn / 100e-12) + " uA/cm^2); " + std::to_string(below) + " and " + std::to_string(above) + " late spikes");
    const double t1 = period(spikes<M>(p, 1.005 * I_sn, 12, h)), t4 = period(spikes<M>(p, 1.02 * I_sn, 12, h));
    s.check("excitability: wang_buzsaki is class 1: four times the excess current halves the period (ratio - 2)", t1 / t4 - 2, 0.1);
    // A fast-spiking interneuron: hundreds of hertz at 10 uA/cm^2, the same at 50 us and 10 us.
    const double f1 = 1 / period(spikes<M>(p, 1 * u::nA, 0.3, 0.05e-3)), f2 = 1 / period(spikes<M>(p, 1 * u::nA, 0.3, 0.01e-3));
    s.require("excitability: wang_buzsaki fires above 200 Hz at 10 uA/cm^2", f1 > 200, shortest(f1) + " Hz");
    s.check("excitability: wang_buzsaki's period at 50 us against 10 us (relative)", std::fabs(f1 / f2 - 1), 0.01);
  }
  // ---- morris_lecar: the SNIC parameters give class 1, the Hopf parameters class 2 --------------------------------
  {
    using M = models::MorrisLecar;
    M::Params snic;
    snic.g_Ca = 400 * u::nS;
    snic.V_3 = 12 * u::mV;
    snic.V_4 = 17.4 * u::mV;
    snic.phi = 1000.0 / 15;
    auto I_ss = [](const M::Params& p) { return [p](double V) { return M::ionic(p, V, M::w_inf(p, V)); }; };
    const double rest = M::initial(snic)[0], I_sn = first_maximum(I_ss(snic), rest, 0, 1e-6), T = 10, h = 0.1e-3;
    const int below = late(spikes<M>(snic, 0.998 * I_sn, T, h), T), above = late(spikes<M>(snic, 1.002 * I_sn, T, h), T);
    s.require("excitability: morris_lecar (SNIC) is silent 0.2% below the saddle-node of its steady-state current and fires 0.2% above it",
              below == 0 && above >= 2, shortest(I_sn / 100e-12) + " uA/cm^2; " + std::to_string(below) + " and " + std::to_string(above) + " late spikes");
    const double t1 = period(spikes<M>(snic, 1.005 * I_sn, 20, h)), t4 = period(spikes<M>(snic, 1.02 * I_sn, 20, h));
    s.check("excitability: morris_lecar (SNIC) is class 1: four times the excess current halves the period (ratio - 2)", t1 / t4 - 2, 0.1);

    const M::Params hopf;
    auto equilibrium = [&](double V) { return State<M::n>{V, M::w_inf(hopf, V), 0, 0, 1}; };
    const double I_h = hopf_current<M>(hopf, equilibrium, I_ss(hopf), M::initial(hopf)[0], 0, 2000, 1e-6);
    auto at = [&](double I) { M::Params q = hopf; q.I_e = I; return q; };
    const double kick = 100 * u::pA;  // 0.1 mV
    const int stays = late(spikes<M>(at(0.99 * I_h), 0, T, h, kick), T), grows = late(spikes<M>(at(1.01 * I_h), 0, T, h, kick), T);
    s.require("excitability: morris_lecar (Hopf) at rest returns from a kick 1% below its Hopf current and is driven into firing 1% above it",
              stays == 0 && grows >= 2, shortest(I_h / 100e-12) + " uA/cm^2; " + std::to_string(stays) + " and " + std::to_string(grows) + " late spikes");
    const double f_h = 1 / period(spikes<M>(at(1.01 * I_h), 0, T, h, kick)), f_sn = 1 / period(spikes<M>(snic, 1.005 * I_sn, 20, h));
    s.require("excitability: morris_lecar (Hopf) is class 2: it begins to fire at a rate bounded away from zero, unlike the SNIC set",
              f_h > 5 && f_h > 3 * f_sn, shortest(f_h) + " Hz at 1% above I_H; SNIC " + shortest(f_sn) + " Hz at 0.5% above I_SN");

    // Each broad spike is counted once: as many spikes as maxima of V above V_spike.
    Network net({h, 1, 1});
    auto& pop = net.add<M>("n", 1, hopf);
    auto d = std::make_unique<CurrentInput>();
    d->target = &pop;
    d->amplitude = 1.5 * I_h;
    net.add_device(std::move(d));
    auto& rec = net.record_spikes(pop);
    auto& v = net.record_state(pop, {0}, {0});
    net.run(2.0);
    const auto& V = v.values[0];
    std::size_t maxima = 0;
    for (std::size_t k = 1; k + 1 < V.size(); k++) maxima += V[k] > hopf.V_spike && V[k] >= V[k - 1] && V[k] > V[k + 1];
    s.require("excitability: morris_lecar counts each broad spike once (spikes = maxima above V_spike)", maxima == rec.spikes.size() && maxima > 10,
              std::to_string(rec.spikes.size()) + " spikes, " + std::to_string(maxima) + " maxima");

    // A population and physis's simulation of the same neuron, both re-arming by settle(), agree.
    std::vector<double> mine;
    for (const auto& sp : rec.spikes) mine.push_back(sp.time * h);
    const auto tr = pd::simulate<M>(hopf, M::initial(hopf), [&](double) { return 1.5 * I_h; }, 2.0, h, {M::method, 1, {1e-6, 1e-6}}, 0, M::scale);
    s.require("excitability: a morris_lecar population and physis's simulation of one neuron fire at the same steps", tr.events == mine,
              std::to_string(mine.size()) + " and " + std::to_string(tr.events.size()) + " spikes");
  }
  // ---- fitzhugh_nagumo: the Hopf current of the closed form --------------------------------------------------------
  {
    using M = models::FitzhughNagumo;
    const M::Params p;
    const double vs = -std::sqrt(1 - p.epsilon * p.b), I_h = (vs + p.a) / p.b - vs + vs * vs * vs / 3;
    auto equilibrium = [&](double v) { return State<M::n>{v, (v + p.a) / p.b, 1}; };
    auto current = [&](double v) { return (v + p.a) / p.b - v + v * v * v / 3; };
    const double I_num = hopf_current<M>(p, equilibrium, current, M::initial(p)[0], 0, 1000, 1e-6);
    s.check("excitability: fitzhugh_nagumo's Hopf current, from the Jacobian of its equations against the closed form", I_num - I_h, 1e-9);
    auto at = [&](double I) { M::Params q = p; q.I_e = I; return q; };
    const double T = 20, h = 0.1e-3;
    const int stays = late(spikes<M>(at(0.99 * I_h), 0, T, h, 1e-3), T), grows = late(spikes<M>(at(1.01 * I_h), 0, T, h, 1e-3), T);
    s.require("excitability: fitzhugh_nagumo at rest returns from a kick 1% below I_H and is driven into firing 1% above it",
              stays == 0 && grows >= 2, shortest(I_h) + "; " + std::to_string(stays) + " and " + std::to_string(grows) + " late spikes");
  }
  return s.done();
}
