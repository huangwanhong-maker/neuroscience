// Networks of spiking neurons: the public interface of the neuroscience domain's `snn` module.
//
//   #include <neuroscience/snn/snn.hpp>
//
// Models of neurons (models/), their populations (population.hpp), synapses and their
// plasticity (synapses.hpp), networks with their devices and recorders (network.hpp),
// specifications in JSON (spec.hpp), and the mean-field theory the simulations are checked
// against (theory.hpp). Theory: domains/neuroscience/theory/spiking-networks.md.

#pragma once

#include "analysis.hpp"
#include "json.hpp"
#include "model.hpp"
#include "models.hpp"
#include "network.hpp"
#include "population.hpp"
#include "spec.hpp"
#include "synapses.hpp"
#include "theory.hpp"
