---
title: Spiking networks compiled to devices
status: seed
date: 2026-10-23
---

# Spiking Networks Compiled to Devices

*Recorded on 2026-10-23 at the user's direction: the `snn` module is a simulator, of classical and quantum neurons alike; running networks on physical machines, and the compiler that takes them there, belong to the future plan and are not built now.*

## 1. The Principle

A model in `snn` is a declaration, not a loop: its state components with their dimensions, its flow (a linear system, or a derivative, or an exact advance), its guard or hazard, its jump, its dwell, its silent jump, and its receptors. A network is data: populations, projections with their connection rules, delays and plasticity, and devices. The C++ engine is one interpretation of that data, on the CPU's threads. A compiler can take the same declaration, lower it to calx's intermediate representation, schedule it and hand it to a backend ([calx](https://github.com/huangwanhong-maker/calx), `compute/`).

The simulator is then the reference. calx's rule holds here too: the CPU interpreter defines correct results, and every device is checked against it, within the precision it declares. The checks of `snn` (closed forms, bifurcations, mean fields, master equations) become the checks of every device.

## 2. What a Compiler Lowers

- **The update of a population:** for each neuron, the flow (a propagator applied, an integrator's step, a closed-form exponential), the arrivals from the ring, the silent jump, and the event test. This is a map over neurons with no dependence between them.
- **The delivery of spikes:** a sparse scatter over the rows of the connectivity, into the rings of the targets at their delays.
- **Plasticity:** event-driven updates of synaptic state, evaluated lazily at presynaptic spikes over the postsynaptic history.
- **Randomness:** Philox streams keyed by purpose, entity and step, which give the same numbers on any device, so that a run on a device can be compared with the simulator spike for spike.
- **Synchronisation:** the windows of the shortest delay, within which parts of a network need not wait for one another. They map onto cores, chips and boards.

## 3. Targets

1. **GPUs,** through calx's backends: dense updates of populations, sparse delivery.
2. **Neuromorphic chips:**
   - Loihi 2 (Intel), through its own software stack behind a calx backend. Its neurons (current-based LIF, resonate-and-fire, sigma-delta with graded spikes) are discrete-time and fixed-point (survey §1.8).
   - SpiNNaker 2, event-driven on many ARM cores.
   - BrainScaleS-2, analog and accelerated, with its parameters calibrated per circuit.

   Where a chip's neuron differs from the continuous model, a device-faithful model in the library (bit-accurate fixed-point arithmetic on the chip's own time step) lets the simulator predict what the chip computes, exactly, before it runs.
3. **Quantum processors,** for quantum neurons:
   - the two-level emitter as a driven qubit, with its decay measured as it happens (mid-circuit measurement as detection, and pulses as gate rotations);
   - Ising-type networks on annealers or coherent Ising machines.

   The master equation and its trajectories, as the simulator computes them, are the reference.

## 4. Questions for the Compiler

- **Precision.** Fixed-point quantisation is declared, never silent (calx). The effect of each quantisation on the checks is measured against the double-precision simulator.
- **Time.** Grid-based devices take the network's step. Asynchronous ones need the delays mapped onto their delay lines, and the grid's statistics restated, as Proposition 6 of the [theory](../../theory/spiking-networks.md) does for quantum detections.
- **Placement.** Populations and their synapses are partitioned across cores and chips by the communication between them.
- **Plasticity on chips** that update synapses at postsynaptic spikes rather than lazily at presynaptic ones.
- **Vendor stacks.** Their licences and terms of access are to be checked before any is adopted (the infrastructure's licence policy).

## 5. Order, When the Work Begins

1. calx's IR and its CPU interpreter, expressing the update and the delivery, checked spike for spike against `snn`.
2. A GPU backend.
3. One neuromorphic target, with its device-faithful models.
4. Quantum hardware for quantum neurons.
