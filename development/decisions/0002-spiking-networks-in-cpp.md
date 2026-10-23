# 0002. Networks of Spiking Neurons, in C++ on the Foundations

- **Status:** Accepted
- **Date:** 2026-10-23
- **Decided by:** the user asked for spiking neural networks next, with many models including the latest; for dynamics to be abstract, states abstract and models their instances; for the high-performance foundation of large-scale computing to be the main effort, simulation and visualisation being applications above it; for the library to be in the neuroscience domain but not in the Brain Atlas, and for low-level computation in C++ or Python rather than JavaScript; for common mathematics to be separated into the foundations, designed as a whole and written as needed; for original papers to be cited in the models' code; and for recent models to be surveyed. Claude designed the module and wrote this record. The foundations' part is the infrastructure's [ADR 0035](https://github.com/huangwanhong-maker/The-Science-Infrastructures/blob/main/development/decisions/0035-the-mathematical-foundations.md).

## 1. Context

The roadmap of the infrastructure named spiking networks as the first of the next domains' work, as a module of neuroscience. Simulators exist (NEST, Brian 2, GeNN, NEURON); the infrastructure's own engine is wanted for its exactness, its determinism, its place among the domains and foundations, and its future on calx's retargetable stack.

## 2. Decision

1. **A C++ module `snn/` of the domain**, in the namespace `neuroscience::snn`, header-only, built with the domain's `CMakeLists.txt` on calx and physis, with a command-line simulator (`snn run`, `snn models`) and a benchmark.
2. **Neurons are physis hybrid systems** (flow, guard or hazard, jump, dwell with held components) with named parameters, components and receptors, each with its dimension. Linear flows are integrated exactly by physis's propagators; nonlinear ones by calx's integrators or the model's own exact flow.
3. **The engine** keeps each population's state by component; divides every population among threads, each owning its neurons, their arrivals and the synapses ending on them, stored by presynaptic rows; integrates in windows of the shortest delay; merges and sorts each window's spikes; and draws every random number from a stream keyed by what it is for. The result is the same on any number of threads.
4. **Plasticity** is evaluated lazily at the delivery of each presynaptic spike, against a postsynaptic history pruned when used: pair STDP with Gütig et al.'s weight dependence, triplet STDP, and short-term plasticity.
5. **Specifications in JSON** with quantities in their units, checked against the models' dimensions; results in JSON with their units named.
6. **The checks** are C++ programs on calx's `verification`, run by the domain's suite: closed forms, physis's own simulation, published firing patterns, sums over spike pairs, mean-field theory (Siegert, Brunel, Montbrió–Pazó–Roxin), and determinism across thread counts.
7. **The next models** are chosen from a verified survey of recent work (`development/ideas/2026-10-23-a-survey-of-spiking-models.md`), quantum neurons among them; an application to explore networks comes apart from the Brain Atlas.

## 3. Alternatives Considered

- **Wrapping NEST or Brian 2.** They are mature, but GPL (NEST) or Python-bound (Brian 2), and the infrastructure would own neither the exactness, nor the determinism across threads, nor the path onto calx's devices.
- **JavaScript, as the rest of the domain.** The user asked for C++ or Python for low-level computation; the engine's speed (two hundred million synaptic events a second on a laptop) needs it.
- **A module of its own domain.** A network of neurons is neuroscience; the user placed it in the domain.

## 4. Consequences

- The domain has its first C++, and its suite builds it (here, or in WSL on Windows) and counts its 59 checks with the JavaScript's 162.
- The domain's repository gains `CMakeLists.txt`, `snn/` and `development/release-notes/`.
- Brunel's network of 12,500 neurons and 15.6 million synapses runs a second of activity in 2.6 s on the development machine's eight threads.
