# snn: Networks of Spiking Neurons

*Status: draft (2026-10-23).* The neuroscience domain's first C++ module ([decision 0002](../development/decisions/0002-spiking-networks-in-cpp.md)): neurons as hybrid dynamical systems, synapses with their plasticity, networks simulated in parallel and exactly, and the mean-field theory they are checked against. Theory: [spiking networks](../theory/spiking-networks.md).

## 1. Concepts

- **A neuron is a hybrid dynamical system** (physis `dynamics`): a flow between spikes, driven by an input held over each step; a guard at which it fires, or a hazard at which it escapes; a jump that resets it; a dwell, its refractory period, during which some components are held; for a model whose spike is an upward crossing, a silent jump that re-arms the guard once the potential has fallen back. A neuron adds named parameters with their dimensions, components with their units, and receptors, the components that a spike's weight jumps.
- **Exact where it can be.** A model whose flow is linear between spikes is integrated by the exponential of its augmented matrix, exact to rounding (Rotter and Diesmann 1999); the quadratic integrate-and-fire neuron by its closed-form flow; the rest by Dormand and Prince's adaptive method, RK4, Heun, Euler or Rush and Larsen's exponential method.
- **Time is a grid.** A spike lies at a grid point; a spike at s with delay d is received at s + d. A step is: flow, receive the spikes that arrive at its end, then fire. A neuron of a population and the same neuron simulated alone by physis fire at the same steps.
- **Parallel and deterministic.** Each thread owns its neurons and the synapses that end on them; a run goes in windows of the shortest delay, within which threads need not wait; the window's spikes are merged in the order (time, gid) and every thread delivers all of them to its own synapses. Random streams are keyed by what they are for (calx `random`). The same seed gives the same spikes, bit for bit, on any number of threads.
- **Quantities with units.** Inside, everything is in SI units; a specification writes "20 ms", "0.1 mV", "87.8 pA", and a quantity of the wrong dimension is refused.

## 2. Models

| Model | What it is | Flow | Source |
|---|---|---|---|
| `parrot` | Repeats every spike it receives; a source of spikes at chosen times | — | NEST parrot_neuron |
| `lif_psc_delta` | Leaky integrate-and-fire; a spike jumps the potential | exact | Brunel 2000; NEST iaf_psc_delta |
| `lif_psc_exp` | Leaky integrate-and-fire; exponential synaptic currents | exact | Rotter and Diesmann 1999; NEST iaf_psc_exp |
| `lif_psc_alpha` | Leaky integrate-and-fire; alpha-function synaptic currents | exact | Rotter and Diesmann 1999; NEST iaf_psc_alpha |
| `lif_cond_exp` | Leaky integrate-and-fire; exponential conductances | Dormand–Prince | Kuhn, Aertsen and Rotter 2004; NEST iaf_cond_exp |
| `alif` | Adaptive threshold, rising at each spike | exact | Bellec et al. 2018 |
| `adlif` | Adaptive LIF: a linear adaptation current coupled to the potential; it resonates when the coupling is strong | exact | Brette and Gerstner 2005; Bittar and Garner 2022; Baronig et al. 2025 |
| `glif` | Generalised LIF, GLIF1–5: reset rule, spike-triggered and voltage-dependent threshold, after-spike currents | exact | Teeter et al. 2018 |
| `mat2` | Multi-timescale adaptive threshold, no reset | exact | Kobayashi, Tsubo and Shinomoto 2009 |
| `lif_escape` | Leaky integrate-and-fire firing by escape noise, rho_0 exp((V − V_th)/Delta_V) | exact | Gerstner and Kistler 2002; Jolivet et al. 2006 |
| `gif` | Generalised integrate-and-fire with escape noise: a spike-triggered current and a moving threshold, two exponentials each | exact | Mensi et al. 2012; Pozzorini et al. 2013, 2015 |
| `adex` | Adaptive exponential integrate-and-fire | Dormand–Prince | Brette and Gerstner 2005; Naud et al. 2008 |
| `izhikevich` | Izhikevich's simple model | RK4 | Izhikevich 2003 |
| `izhikevich_2007` | The simple model in physical units; the book's regular-spiking neuron | Dormand–Prince | Izhikevich 2007 |
| `hodgkin_huxley` | Sodium, potassium and leak currents with their gates | Dormand–Prince; Rush–Larsen | Hodgkin and Huxley 1952; NEST hh_psc_alpha |
| `wang_buzsaki` | Fast-spiking interneuron, instantaneous sodium activation; class 1 | Dormand–Prince; Rush–Larsen | Wang and Buzsáki 1996 |
| `morris_lecar` | Planar calcium–potassium model; class 2 with the Hopf parameters (default), class 1 with the SNIC ones | Dormand–Prince; Rush–Larsen | Morris and Lecar 1981; Rinzel and Ermentrout 1998 |
| `fitzhugh_nagumo` | The planar caricature of Hodgkin and Huxley, normalised; class 2 | Dormand–Prince | FitzHugh 1961; Nagumo, Arimoto and Yoshizawa 1962 |
| `qif` | Quadratic integrate-and-fire, normalised | exact (closed-form flow) | Ermentrout and Kopell 1986; Montbrió, Pazó and Roxin 2015 |
| `resonate_and_fire` | A damped oscillator firing on its imaginary part | exact | Izhikevich 2001 |
| `brf` | Balanced resonate-and-fire: no reset; its refractoriness raises the threshold and deepens the damping | exact flow; the input of second order while the refractoriness decays | Higuchi, Kairat, Bohte and Otte 2024 |
| `quantum_emitter` | A driven two-level emitter along an exact quantum trajectory of its master equation; its detected photons are its spikes, input spikes are pulses that rotate it | exact (closed-form 2 × 2 exponential; exact probability of a detection per step) | Dalibard, Castin and Mølmer 1992; Carmichael 1993 |

The original papers are cited in each model's source (`include/neuroscience/snn/models/`) and in its `citation`, which `snn models` reports.

## 3. Synapses, Devices and Recorders

- **Connection rules:** one to one, all to all, fixed probability (by geometric skips), fixed in-degree and out-degree (with or without autapses and multapses; distinct sources by Floyd's algorithm), explicit pairs, and *uniform*, a mean-field coupling all to all that stores no synapses.
- **Weights and delays** constant or drawn per synapse (uniform, normal, lognormal, with bounds); weights stored in single precision, declared.
- **Plasticity:** pair STDP with Gütig et al.'s weight dependence (additive to multiplicative), triplet STDP (Pfister and Gerstner 2006), short-term depression and facilitation (Tsodyks and Markram); plastic synapses are updated lazily when their presynaptic spike is delivered, from a postsynaptic history pruned once every plastic synapse has used it.
- **Devices:** Poisson input, spike times, constant and step currents, Gaussian white noise, sinusoidal current.
- **Recorders:** spikes, binned rates, states of chosen neurons at an interval, the mean and spread of a projection's weights.

## 4. Use

From C++:

```cpp
#include <neuroscience/snn/snn.hpp>
using namespace neuroscience::snn;
Network net({0.1e-3, /*seed*/ 1, /*threads*/ 8});
auto& E = net.add<models::LifPscDelta>("E", 10000, params);
net.connect(E, E, "delta", Connectivity::fixed_indegree(1000, false), Distribution::constant(0.1e-3), Distribution::constant(1.5e-3));
auto& spikes = net.record_spikes(E);
net.run(1.0);
```

From JSON, by the command-line simulator (`snn run spec.json --out results.json`; `snn models` lists every model with its parameters):

```json
{
  "resolution": "0.1 ms", "duration": "1 s", "seed": 1, "threads": 8,
  "populations": [{"name": "E", "model": "lif_psc_delta", "size": 10000,
                   "parameters": {"tau_m": "20 ms", "V_th": "20 mV", "V_reset": "10 mV", "E_L": "0 mV"},
                   "initial": {"V": {"uniform": ["0 mV", "20 mV"]}}}],
  "projections": [{"source": "E", "target": "E", "receptor": "delta", "rule": {"fixed_indegree": 1000, "autapses": false},
                   "weight": "0.1 mV", "delay": "1.5 ms", "synapse": {"model": "static"}}],
  "devices": [{"model": "poisson", "target": "E", "rate": "20 kHz", "weight": "0.1 mV", "receptor": "delta"}],
  "recorders": [{"model": "spikes", "population": "E"}, {"model": "rate", "population": "E", "bin": "5 ms"},
                {"model": "state", "population": "E", "neurons": [0, 1], "components": ["V"], "interval": "0.1 ms"}]
}
```

The results give times in seconds and quantities in SI units, each recorded component with its unit.

## 5. Checks and Performance

Eight check programs on calx `verification`, built and run by the domain's suite (`node domains/neuroscience/tests/run-tests.mjs`) through CMake, here or in WSL:

- **models** (32): postsynaptic potentials and currents against closed forms (to 1e-12 of their peak); periods on the grid against first passage; a population against physis's simulation of one neuron, spike for spike; the firing patterns of Naud et al. 2008 (tonic, adapting, initial burst, regular bursting) and Izhikevich 2003 (regular, fast, chattering); Hodgkin and Huxley at rest at −65.000 mV and firing at 69 Hz under two integrators; the QIF period against its closed form; resonate-and-fire, GLIF and escape noise against theirs; the adaptive LIF's resonant free response against the exponential of its system; GIF spike for spike as `lif_escape` without its kernels, and its kernels against their closed forms; BRF exact while its refractoriness is still and of second order while it decays, undamped without loss for 10 s, and selective for its frequency.
- **excitability** (15): the classes of excitability (Hodgkin 1948; Rinzel and Ermentrout 1998). Class 1, for `izhikevich_2007`, `wang_buzsaki` and `morris_lecar` with the SNIC parameters: silent 0.2 % below the saddle-node of the steady-state current, firing 0.2 % above it, and the period halved by four times the excess current. Class 2, for `morris_lecar` with the Hopf parameters and `fitzhugh_nagumo`: a kicked resting state returns 1 % below the Hopf current computed from the model's Jacobian (and from the closed form for FitzHugh–Nagumo) and fires 1 % above it, at a rate bounded away from zero; each broad spike counted once; population and physis spike for spike.
- **quantum** (8): the first photons of 20,000 emitters against the closed-form waiting time (Kolmogorov–Smirnov), exact on the grid; the grid's mean interval against the master equation's rate (Proposition 6 of the theory); the stationary rate; the average of 20,000 trajectories against the master equation; pulses of π and 2π.
- **analysis** (18): the statistics of activity against independent Poisson trains (CV, LV and Fano factors of 1, χ√N = 1, no correlation), clocks (all 0), one shared train (χ and correlation 1) and a population oscillating at 40 Hz (its spectrum's peak); the profile's phases accounting for the run.
- **network** (11): delays; connection rules; Poisson input; uniform projections against explicit ones; the same spikes on 1, 4 and 7 threads.
- **plasticity** (8): pair and triplet STDP against their sums over pairs and triplets of spikes (to float precision); short-term plasticity at its steady states; the pruning of the history.
- **theory** (8): Siegert's rate against neurons in white noise (2.7 % below, as a discrete grid makes it); Brunel's network against its self-consistent rate (55.1 Hz against 54.9 Hz); QIF neurons against the exact mean field of Montbrió, Pazó and Roxin (126 Hz against 128 Hz).
- **spec** (12): JSON against C++, spike for spike; refusals of wrong dimensions, models and parameters.

`snn_benchmark [scale] [seconds] [threads ...]` runs Brunel's network (12,500 neurons, 15.6 million synapses, 590 million synaptic events per simulated second at 38 Hz). On the development machine (i7-11370H, 4 cores, 8 threads, WSL): 6.35 s for a second of activity on one thread (9.4e7 events/s), 2.23 s on four, 1.74 s on eight (3.4e8 events/s). The engine's profile (below) found the Poisson input to take most of the time, and it now draws by inverting a table of the distribution; before, the same run took 8.8 s, 2.9 s and 2.6 s.

**What a run reports.** Beside its spikes, rates, states and weights, a run describes each spike recorder's activity (`analysis.hpp`): each neuron's rate; the irregularity of its intervals (CV, and the local variation LV); the Fano factor of counts; Golomb's synchrony χ and the correlation of counts; the population's rate and its spectrum by Welch's method; histograms of intervals and rates. A specification sets the window and the bins under `"analysis"`. It reports the engine's profile too: the time spent updating the neurons, exchanging and delivering spikes and recording, and each thread's share, so that waiting shows.

## 6. Dependencies

calx (`random`, `linalg`, `integrators`, `special_functions`, `quadrature`, `solvers`, `scheduler`, `verification`); physis (`units`, `dynamics`).

## 7. References

- Brunel, N. (2000), Dynamics of sparsely connected networks of excitatory and inhibitory spiking neurons, *J. Comput. Neurosci.* 8, 183–208.
- Morrison, A., Mehring, C., Geisel, T., Aertsen, A. and Diesmann, M. (2005), Advancing the boundaries of high-connectivity network simulation with distributed computing, *Neural Comput.* 17, 1776–1801.
- Morrison, A., Diesmann, M. and Gerstner, W. (2008), Phenomenological models of synaptic plasticity based on spike timing, *Biol. Cybern.* 98, 459–478.
- Rotter, S. and Diesmann, M. (1999), Exact digital simulation of time-invariant linear systems with applications to neuronal modeling, *Biol. Cybern.* 81, 381–402.
- Montbrió, E., Pazó, D. and Roxin, A. (2015), Macroscopic description for networks of spiking neurons, *Phys. Rev. X* 5, 021028.
- and the sources of each model and rule above, cited in its code.

## 8. Open Questions

1. **Models from the survey of recent work** still to be written (multi-compartment and dendritic neurons, neural masses, the Loihi neurons, the Poisson GLM; learning rules such as e-prop, three-factor and burst-dependent plasticity), and more quantum neurons: open quantum Hopfield networks (Rotondo et al. 2018), whose jump rates depend on the other spins, and Ising-like networks.
2. **Precise spike times** between grid points (Hanuschkin et al. 2010) for models where they matter.
3. **A faster draw of random numbers**, now that the profile shows one Philox block per neuron and step to be the update's largest cost: blocks drawn for many neurons at once, in vector registers.
4. **Compilation to devices**, planned and not built: networks lowered through calx's IR to GPUs, neuromorphic chips (Loihi 2, SpiNNaker 2, BrainScaleS-2) and quantum processors, with this simulator as the reference every device is checked against ([idea](../development/ideas/2026-10-23-spiking-networks-on-devices.md)).
5. **Python bindings** (nanobind), beside the command line and the [Spiking Simulator](https://github.com/huangwanhong-maker/The-Science-Infrastructures/tree/main/applications/spiking-simulator).
6. **Distributed simulation** across processes, by the same windows of the shortest delay.
