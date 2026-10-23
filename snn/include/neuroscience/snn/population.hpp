// A population: many neurons of one model, stored component by component.
//
// The state of the population is an array per component (structure of arrays), so that
// the loop over neurons streams through memory and vectorises; the loop is generated for
// each model (PopulationOf<M>), and the network reaches it through the type-erased base.
//
// Time is a grid t_k = k h. Integrating step k (from t_k to t_{k+1}) a neuron
//   1. flows over h with the input held: the population's bias and the currents that
//      devices put in for the step (exactly for a linear model, by the model's own flow if
//      it has one, else by its integrator), with its held components still if it dwells;
//   2. receives the spikes arriving at t_{k+1}, each jumping its receptor's component by its
//      weight, except a held component, which discards them (NEST's convention), and
//      settles (a model that counts upward crossings re-arms its guard);
//   3. if it is not dwelling and its state lies in the guard (or, for an escape-noise model,
//      with probability 1 - exp(-rho h)), fires at t_{k+1}: it jumps and dwells for t_ref.
// This is physis::dynamics::simulate's order, with the arrivals of step 2 added; a neuron of
// a population and the same neuron simulated alone agree exactly.
//
// Arrivals are kept in a ring of slots, one per time index modulo its length, and within a
// slot by receptor and neuron: ring[(slot R + r) N + i]. Each thread writes only the
// entries of the neurons it owns, so that no two threads touch the same entry.

#pragma once

#include <array>
#include <cmath>
#include <cstdint>
#include <deque>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>

#include <calx/random/stream.hpp>
#include <calx/scheduler/thread_pool.hpp>

#include "model.hpp"

namespace neuroscience::snn {

using Step = std::int64_t;
using Gid = std::uint32_t;
using calx::scheduler::Range;

// A spike at time index `time` (the time time h) of neuron `gid`.
struct Spike {
  Step time;
  Gid gid;
  friend bool operator<(const Spike& a, const Spike& b) { return a.time != b.time ? a.time < b.time : a.gid < b.gid; }
};

// What the network may ask of any model, at run time.
struct ModelInfo {
  struct Param { std::string_view name; Dimension dimension; double value; std::string_view doc; };
  std::string_view name, summary, citation;
  std::vector<Param> parameters;
  std::vector<Component> components;
  std::vector<Receptor> receptors;
  Dimension input;
  pd::Method method;
  bool linear, escaping;
};

template <Model M>
ModelInfo info_of() {
  ModelInfo m{M::name, M::summary, M::citation, {}, {}, {}, M::input, M::method, pd::LinearFlow<M>, Escaping<M>};
  const typename M::Params defaults{};
  for (const auto& p : M::parameters) m.parameters.push_back({p.name, p.dimension, defaults.*(p.field), p.doc});
  for (const auto& c : M::components) m.components.push_back(c);
  for (const auto& r : M::receptors) m.receptors.push_back(r);
  return m;
}

// The purposes of random streams, in the top byte of a stream's third identity word.
enum class Purpose : std::uint32_t { connection = 1, weight = 2, delay = 3, initial = 4, poisson = 5, noise = 6, escape = 7, user = 15 };
inline std::uint32_t tag(Purpose p, std::uint32_t object) { return (static_cast<std::uint32_t>(p) << 24) | (object & 0xFFFFFFu); }

// A post-synaptic spike kept for plastic synapses, with the number of them that have used it.
struct PostSpike {
  Step time;
  std::uint32_t used;
};

class Population {
 public:
  virtual ~Population() = default;

  std::string name;
  std::uint32_t index = 0;  // in the network
  Gid first = 0;            // the gid of neuron 0
  std::size_t size = 0;

  // Set by the network before the run.
  std::vector<Range> parts;   // the neurons each thread owns
  std::size_t slots = 0;      // of the ring
  std::vector<double> ring;   // arrivals, [slot][receptor][neuron]
  std::vector<double> current;  // the devices' current for the step being integrated, per neuron
  std::vector<double> bias;     // a constant input per neuron (empty: none)
  // Plasticity: the spikes of each neuron that plastic synapses onto it have yet to use.
  std::vector<std::uint32_t> plastic_in;
  std::vector<std::deque<PostSpike>> history;

  virtual const ModelInfo& info() const = 0;
  std::size_t receptors() const { return info().receptors.size(); }
  std::size_t components() const { return info().components.size(); }
  std::size_t receptor(std::string_view r) const {
    const auto& rs = info().receptors;
    for (std::size_t i = 0; i < rs.size(); i++) if (rs[i].name == r) return i;
    throw std::invalid_argument("population \"" + name + "\" (" + std::string(info().name) + ") has no receptor \"" + std::string(r) + "\"");
  }
  std::size_t component(std::string_view c) const {
    const auto& cs = info().components;
    for (std::size_t i = 0; i < cs.size(); i++) if (cs[i].name == c) return i;
    throw std::invalid_argument("population \"" + name + "\" (" + std::string(info().name) + ") has no component \"" + std::string(c) + "\"");
  }
  Dimension receptor_dimension(std::size_t r) const { return info().components[info().receptors[r].component].dimension; }

  // Parameters by name, in SI units (checked for dimension by the caller).
  virtual void set_parameter(std::string_view name, double value) = 0;
  virtual double parameter(std::string_view name) const = 0;
  // The state.
  virtual double get(std::size_t component, std::size_t i) const = 0;
  virtual void set(std::size_t component, std::size_t i, double value) = 0;
  virtual bool dwelling(std::size_t i) const = 0;

  // Prepares for a run at step h: propagators, dwell lengths, the ring of `slots` slots.
  virtual void prepare(double h, std::uint64_t seed, std::size_t ring_slots, const pd::Stepping& stepping) = 0;
  // Integrates step k for the neurons of `thread`, appending the spikes at t_{k+1}.
  virtual void update(Step k, std::size_t thread, std::vector<Spike>& out) = 0;

  double* arrivals(Step time, std::size_t receptor) { return ring.data() + ((static_cast<std::size_t>(time) % slots) * receptors() + receptor) * size; }
};

template <Model M>
class PopulationOf final : public Population {
 public:
  using Params = typename M::Params;
  Params p;

  PopulationOf(std::string population_name, std::size_t n, const Params& params = {}) : p(params) {
    name = std::move(population_name);
    size = n;
    const State<M::n> x0 = M::initial(p);
    for (std::size_t c = 0; c < M::n; c++) x_[c].assign(n, x0[c]);
    dwell_.assign(n, 0);
    info_ = info_of<M>();
  }

  const ModelInfo& info() const override { return info_; }

  void set_parameter(std::string_view key, double value) override {
    for (const auto& q : M::parameters)
      if (q.name == key) { p.*(q.field) = value; return; }
    throw std::invalid_argument(std::string(M::name) + " has no parameter \"" + std::string(key) + "\"");
  }
  double parameter(std::string_view key) const override {
    for (const auto& q : M::parameters)
      if (q.name == key) return p.*(q.field);
    throw std::invalid_argument(std::string(M::name) + " has no parameter \"" + std::string(key) + "\"");
  }
  double get(std::size_t c, std::size_t i) const override { return x_[c][i]; }
  void set(std::size_t c, std::size_t i, double v) override { x_[c][i] = v; }
  bool dwelling(std::size_t i) const override { return dwell_[i] > 0; }
  // Resets every neuron to the model's initial state for the present parameters.
  void reinitialise() {
    const State<M::n> x0 = M::initial(p);
    for (std::size_t c = 0; c < M::n; c++) std::fill(x_[c].begin(), x_[c].end(), x0[c]);
  }

  void prepare(double h, std::uint64_t seed, std::size_t ring_slots, const pd::Stepping& stepping) override {
    h_ = h;
    seed_ = seed;
    stepping_ = stepping;
    if (stepping_.method == pd::Method::exact && !pd::LinearFlow<M> && !Advancing<M>) stepping_.method = M::method;
    if constexpr (pd::LinearFlow<M>) {
      free_ = pd::linear_propagator<M>(p, h);
      held_ = pd::linear_propagator<M>(p, h, M::held);
    }
    dwell_steps_ = static_cast<std::int32_t>(std::llround(M::dwell(p) / h));
    slots = ring_slots;
    ring.assign(slots * M::receptors.size() * size, 0.0);
    current.assign(size, 0.0);
    sub_.assign(size, 0.0);
  }

  void update(Step k, std::size_t thread, std::vector<Spike>& out) override {
    const Range r = parts[thread];
    constexpr std::size_t R = M::receptors.size();
    std::array<double*, R> in{};
    for (std::size_t q = 0; q < R; q++) in[q] = arrivals(k + 1, q);
    const bool has_bias = !bias.empty();
    constexpr std::array<bool, M::n> none{};
    for (std::size_t i = r.begin; i < r.end; i++) {
      State<M::n> s;
      for (std::size_t c = 0; c < M::n; c++) s[c] = x_[c][i];
      const double u = current[i] + (has_bias ? bias[i] : 0.0);
      current[i] = 0;
      const bool hold = dwell_[i] > 0;
      // 1. the flow
      if constexpr (pd::LinearFlow<M>) {
        (hold ? held_ : free_).apply(s, u);
      } else if constexpr (Advancing<M>) {
        if (stepping_.method == pd::Method::exact) M::advance(p, s, u, h_, hold ? M::held : none);
        else pd::step<M>(p, s, u, h_, stepping_, hold ? M::held : none, sub_[i], M::scale);
      } else {
        pd::step<M>(p, s, u, h_, stepping_, hold ? M::held : none, sub_[i], M::scale);
      }
      // 2. the arrivals at t_{k+1}
      for (std::size_t q = 0; q < R; q++) {
        const double w = in[q][i];
        if (w == 0) continue;
        in[q][i] = 0;
        if (hold && M::held[M::receptors[q].component]) continue;
        receive<M>(p, s, q, w);
      }
      if constexpr (Settling<M>) M::settle(p, s);
      // 3. the event
      if (hold) {
        dwell_[i]--;
      } else {
        bool fire;
        if constexpr (Escaping<M>) {
          const double rho = M::hazard(p, s);
          calx::random::Stream z(seed_, static_cast<std::uint32_t>(k), first + static_cast<std::uint32_t>(i), tag(Purpose::escape, index));
          fire = z.uniform() < -std::expm1(-rho * h_);
        } else {
          fire = M::guard(p, s);
        }
        if (fire) {
          M::jump(p, s);
          dwell_[i] = dwell_steps_;
          out.push_back({k + 1, first + static_cast<Gid>(i)});
        }
      }
      for (std::size_t c = 0; c < M::n; c++) x_[c][i] = s[c];
    }
  }

 private:
  ModelInfo info_;
  std::array<std::vector<double>, M::n> x_;
  std::vector<std::int32_t> dwell_;
  std::vector<double> sub_;
  pd::Propagator<M::n> free_, held_;
  pd::Stepping stepping_;
  std::int32_t dwell_steps_ = 0;
  double h_ = 0;
  std::uint64_t seed_ = 0;
};

}  // namespace neuroscience::snn
