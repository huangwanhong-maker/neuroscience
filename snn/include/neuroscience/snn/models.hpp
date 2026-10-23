// Every model of the library, as a list of types, and the registry that makes a population
// of any of them by name.

#pragma once

#include <memory>
#include <stdexcept>
#include <string>
#include <string_view>
#include <tuple>
#include <vector>

#include "models/excitability.hpp"
#include "models/integrate_and_fire.hpp"
#include "models/nonlinear.hpp"
#include "models/quantum.hpp"
#include "population.hpp"

namespace neuroscience::snn {

using AllModels = std::tuple<models::Parrot, models::LifPscDelta, models::LifPscExp, models::LifPscAlpha, models::LifCondExp,
                             models::Alif, models::Adlif, models::Glif, models::Mat2, models::LifEscape, models::Gif, models::Adex,
                             models::Izhikevich, models::Izhikevich2007, models::HodgkinHuxley, models::WangBuzsaki,
                             models::MorrisLecar, models::FitzhughNagumo, models::Qif, models::ResonateAndFire, models::Brf,
                             models::QuantumEmitter>;

namespace detail {

template <class F, std::size_t... I>
void each_model(F&& f, std::index_sequence<I...>) {
  (f(static_cast<std::tuple_element_t<I, AllModels>*>(nullptr)), ...);
}

}  // namespace detail

// Calls f(static_cast<M*>(nullptr)) for every model M.
template <class F>
void for_each_model(F&& f) {
  detail::each_model(f, std::make_index_sequence<std::tuple_size_v<AllModels>>{});
}

inline std::vector<ModelInfo> model_infos() {
  std::vector<ModelInfo> out;
  for_each_model([&](auto* m) { out.push_back(info_of<std::remove_pointer_t<decltype(m)>>()); });
  return out;
}

// A population of the named model, with its default parameters.
inline std::unique_ptr<Population> make_population(std::string_view model, std::string name, std::size_t n) {
  std::unique_ptr<Population> out;
  for_each_model([&](auto* m) {
    using M = std::remove_pointer_t<decltype(m)>;
    if (!out && M::name == model) out = std::make_unique<PopulationOf<M>>(std::move(name), n);
  });
  if (!out) throw std::invalid_argument("no model \"" + std::string(model) + "\"");
  return out;
}

}  // namespace neuroscience::snn
