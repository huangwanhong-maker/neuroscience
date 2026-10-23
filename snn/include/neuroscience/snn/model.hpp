// What a model of a neuron is.
//
// To physis, a neuron is a hybrid dynamical system (physis/dynamics): a flow between spikes,
// driven by an input held over each step; a guard at which it fires; a jump that resets
// it; a dwell (its refractory period) during which some components are held. A neuron adds
// to that what a network needs of it:
//
// - named parameters, each a field of the model's parameter struct with its dimension, so
//   that a specification can set it from a quantity with units ("10 ms") and be refused a
//   quantity of another dimension;
// - named components of its state with their dimensions and typical sizes (the sizes keep
//   exact propagators accurate in SI units, and set the tolerances of adaptive methods);
// - receptors: the kinds of synapse it has, each the component a spike's weight jumps (an
//   excitatory current, an inhibitory conductance, the potential itself);
// - the dimension of its input (a current, or for a model in normalised units its own);
// - its initial state, and the method that integrates it by default.
//
// A model may also define receive() to change how a spike acts (an alpha synapse scales
// it), advance() to integrate its own flow exactly where it can (the quadratic
// integrate-and-fire neuron), hazard() to fire by escape noise instead of a guard, and
// settle() to re-arm a guard that counts upward crossings.

#pragma once

#include <array>
#include <cmath>
#include <concepts>
#include <cstddef>
#include <string_view>

#include <physis/dynamics/hybrid.hpp>
#include <physis/units/quantity.hpp>

namespace neuroscience::snn {

namespace pd = physis::dynamics;
namespace pu = physis::units;
namespace dim = physis::units::dim;
namespace unit = physis::units::unit;
using pd::State;
using pu::Dimension;

template <class P>
struct Parameter {
  std::string_view name;
  double P::*field;
  Dimension dimension;
  std::string_view doc;
};

struct Component {
  std::string_view name;
  Dimension dimension;
  std::string_view doc;
};

struct Receptor {
  std::string_view name;
  std::size_t component;  // the component a spike's weight is added to
  std::string_view doc;
};

template <class M>
concept Model = pd::Hybrid<M> && requires(const typename M::Params& p) {
  { M::name } -> std::convertible_to<std::string_view>;
  { M::summary } -> std::convertible_to<std::string_view>;
  { M::citation } -> std::convertible_to<std::string_view>;
  { M::input } -> std::convertible_to<Dimension>;
  { M::method } -> std::convertible_to<pd::Method>;
  { M::initial(p) } -> std::same_as<State<M::n>>;
  M::parameters;
  M::components;
  M::receptors;
  M::scale;
  { M::input_scale } -> std::convertible_to<double>;
};

// The effect of a spike of weight w on receptor r.
template <Model M>
inline void receive(const typename M::Params& p, State<M::n>& x, std::size_t r, double w) {
  if constexpr (requires { M::receive(p, x, r, w); }) M::receive(p, x, r, w);
  else x[M::receptors[r].component] += w;
}

template <class M>
concept Advancing = requires(const typename M::Params& p, State<M::n>& x, double u, double h, const std::array<bool, M::n>& held) {
  { M::advance(p, x, u, h, held) };
};

template <class M>
concept Escaping = requires(const typename M::Params& p, const State<M::n>& x) {
  { M::hazard(p, x) } -> std::convertible_to<double>;
};

// A model whose spike is an upward crossing re-arms its guard by a silent jump, settle()
// (physis/dynamics), called after the flow and the arrivals and before the guard is tested:
// a broad spike is counted once, and the next only after the potential has fallen back.
using pd::Settling;

// x / (1 - exp(-x)), continuous at 0 (where it is 1 + x/2 + x^2/12): the form of the
// Hodgkin-Huxley rate functions, whose removable singularity must not divide by zero.
inline double exprel(double x) {
  if (std::fabs(x) < 1e-6) return 1 + x / 2 + x * x / 12;
  return x / -std::expm1(-x);
}

}  // namespace neuroscience::snn
