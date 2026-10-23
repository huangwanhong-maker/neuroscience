---
title: Networks of Spiking Neurons, Exactly and in Parallel
status: draft
implemented-by:
  - domains/neuroscience/snn/include/neuroscience/snn/model.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/population.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/network.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/synapses.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/theory.hpp
references: [RotterDiesmann1999, VanLoan1978, Morrison2005, Morrison2008, Gutig2003, Song2000, vanRossum2000, PfisterGerstner2006, TsodyksMarkram1997, Markram1998, Siegert1951, Brunel2000, BrunelChance2001, MontbrioPazoRoxin2015, BretteGerstner2005, Naud2008, Izhikevich2003, HodgkinHuxley1952, Salmon2011]
---

# Networks of Spiking Neurons, Exactly and in Parallel

A network of spiking neurons is a large hybrid dynamical system: each neuron flows continuously between its spikes, and each spike is an event that, after a delay, jumps the state of the neurons it reaches. This note states the model in that form, shows how it is integrated exactly where exactness is possible, proves that the parallel scheme computes the same result as the sequential one, derives the lazy evaluation of plasticity, and recalls the mean-field theory against which the simulations are checked.

## 1. A Neuron as a Hybrid System

**Definition 1 (neuron model).** A neuron model is a tuple (X, f, G, R, τ_ref, H, ρ) where X = ℝⁿ is the state space; f(x; u) is a vector field driven by an input u, held constant over each step; G ⊂ X is the guard, the states at which the neuron fires; R : G → X is the jump applied when it fires; τ_ref ≥ 0 is the dwell after a spike, during which the components in H ⊆ {1, …, n} are held and G is not tested. A receptor is a component r, and a spike of weight w arriving at it is the jump x_r ← x_r + w. An escape-noise model replaces G by a hazard ρ(x) ≥ 0, firing in an interval dt with probability ρ dt.

*Remark.* Every quantity is in SI units, and every parameter, component and receptor declares its dimension, an element of the free abelian group ℤ⁷ over the base units (physis `units`). A weight on a receptor has the dimension of the receptor's component: amperes for a current, siemens for a conductance, volts for a jump of the potential.

## 2. Exact Integration of Linear Flows

When f is affine, f(x; u) = A x + B u + c, the flow over a step h with u held is

$$x(t + h) = e^{Ah} x(t) + \int_0^h e^{As}\,ds\,(B u + c). \tag{1}$$

**Proposition 1 (Van Loan 1978).** Let M = [[A, B, c], [0, 0, 0], [0, 0, 0]] h. Then e^M = [[P, Q, r], [0, I, 0], [0, 0, 1]] with P = e^{Ah}, Q = ∫₀ʰ e^{As} ds B and r = ∫₀ʰ e^{As} ds c.

*Proof.* M is block upper triangular with nilpotent lower blocks; the upper blocks of Mᵏ are Aᵏhᵏ and A^{k−1}hᵏ [B, c], and summing the series gives P = Σ Aᵏhᵏ/k! = e^{Ah} and Q = Σ A^{k−1}hᵏ/k! B = ∫₀ʰ e^{As} ds B, and likewise r. ∎

So (1) is applied as x ← P x + Q u + r, exact to rounding, whatever A, and without inverting A (Rotter and Diesmann 1999). Held components are rows of A, B and c set to zero, whose propagator holds them fixed: the refractory propagator of a model is computed once beside its free one.

*Remark (scales).* In SI units a potential near 10⁻² V is driven by a current near 10⁻¹⁰ A through 10⁸ Ω, so M has entries of 10⁵ beside entries of 10⁻². Its norm forces some seventeen squarings in the exponential, which cost the small entries their accuracy (a relative error of 10⁻¹¹ is observed). The propagator is computed in dimensionless form, D⁻¹ M D with D the components' typical sizes rounded to powers of two (an exact scaling), and scaled back; the error falls to 6 × 10⁻¹⁵.

## 3. The Order of a Step, and Delays

Time is the grid t_k = k h. Step k takes every neuron from t_k to t_{k+1}: it flows; it receives the spikes that arrive at t_{k+1}, each a jump of its receptor, except on a held component (which discards them, as NEST does); and, if not dwelling, it fires at t_{k+1} when its state lies in G, then jumps and dwells. A spike at t_s through a synapse of delay d ≥ h arrives at t_{s+d}.

**Proposition 2 (conservative windows).** Let d_min ≥ 1 be the shortest delay in steps. The steps k₀, …, k₀ + d_min − 1 of all neurons depend on no spike emitted in those steps.

*Proof.* A spike emitted in step k ≥ k₀ lies at t_{k+1} and arrives at t_{k+1+d} with d ≥ d_min, so it is received in step k + d ≥ k₀ + d_min, after the window. ∎

So the neurons may be integrated through a window of d_min steps independently, and the window's spikes delivered afterwards (Morrison et al. 2005).

## 4. The Same Result on Any Number of Threads

Each thread owns a contiguous part of every population, the ring of arrivals of those neurons, and the synapses that end on them, stored by rows of presynaptic neurons. After each window the threads' spikes are merged and sorted by (time, gid), and every thread walks the whole list, delivering into its own neurons.

**Proposition 3 (determinism).** With connectivity, initial states and inputs drawn from streams keyed by what they are for, the spikes of a run do not depend on the number of threads.

*Proof.* The partition decides only which thread computes a neuron's step, not what it computes: a neuron's step reads only its own state, its own arrivals and draws keyed by (step, neuron). Its arrivals are sums, and floating-point addition is not associative; but each target sums its arrivals in the order of the sorted spike list, and for one spike in the order of that source's synapses onto it, which are generated for the target from its own stream and stored in a stable order. These orders do not depend on the partition. By induction over windows, every state, and so every spike, is the same. ∎

The checks run Brunel's network on 1, 4 and 7 threads and compare the spikes bit for bit.

## 5. Plasticity, Evaluated Lazily

A synapse with delay d sees its presynaptic spikes at their times s and its postsynaptic spikes at q = p + d (the delay standing for back-propagation along the dendrite; Morrison, Diesmann and Gerstner 2008). For all-to-all pair STDP with traces K₊ (of the presynaptic spikes, time constant τ₊) and K₋ (of the postsynaptic, τ₋), a pair (s, q) potentiates if q > s and depresses if q ≤ s.

**Proposition 4.** Processing, at each presynaptic spike s, first every postsynaptic spike q with s′ < q ≤ s (s′ the previous presynaptic spike) as a potentiation by K₊(q), then s as a depression by K₋(s), applies every pair exactly once, and needs no future spike.

*Proof.* A pair (sᵢ, q) with q > sᵢ is applied at the first presynaptic spike s_k ≥ q, since q lies in (s_{k−1}, s_k] and K₊(q) contains sᵢ < q; a pair with q ≤ sᵢ is applied at sᵢ through K₋(sᵢ). When s is delivered (after its window), every p with p + d ≤ s satisfies p ≤ s − d < s, and has happened. ∎

For additive STDP the weight change is therefore the sum over pairs, λ Σ e^{−(q−s)/τ₊} − αλ Σ e^{−(s−q)/τ₋}, and the checks compute that sum directly from the spike times; with weight dependence (Gütig et al. 2003), w̃ ← w̃ + λ(1 − w̃)^{μ₊} K₊ and w̃ ← w̃ − αλ w̃^{μ₋} K₋, applied in the order of Proposition 4. The triplet rule (Pfister and Gerstner 2006) adds the slower traces r₂ and o₂, read just before their own increments, and is checked against its sums over pairs and triplets. A postsynaptic spike is kept until every plastic synapse onto its neuron has used it.

Short-term plasticity (Tsodyks and Markram 1997; Markram, Wang and Tsodyks 1998) carries w uₙ xₙ at the n-th spike, with u_{n+1} = U + uₙ(1 − U)e^{−Δ/τ_F} and x_{n+1} = 1 + (xₙ − uₙxₙ − 1)e^{−Δ/τ_D}; for a regular train its fixed points are u* = U/(1 − (1 − U)e^{−Δ/τ_F}) and x* = (1 − e^{−Δ/τ_D})/(1 − (1 − u*)e^{−Δ/τ_D}).

## 6. Mean Fields

**The noise-driven integrate-and-fire neuron.** Driven by white noise so that its free potential has mean μ and standard deviation σ/√2 (τ V′ = −V + μ + σ√τ ξ), it fires at the rate (Siegert 1951; Brunel 2000, eq. 21)

$$\frac{1}{\nu} = \tau_{rp} + \tau\sqrt{\pi}\int_{(V_r-\mu)/\sigma}^{(\theta-\mu)/\sigma} e^{u^2}(1+\operatorname{erf} u)\,du, \tag{2}$$

with e^{u²}(1 + erf u) = erfcx(−u), integrated by adaptive Gauss–Kronrod. On a grid of step h the threshold crossings between grid points are missed, lowering the rate by a relative amount of order √(h/τ) (Brunel, Chance, Fourcaud and Abbott 2001).

**Brunel's network.** With C_E excitatory synapses of weight J, γC_E inhibitory ones of weight −gJ, and external input at ν_ext per synapse, μ = C_E J τ(ν_ext + ν(1 − gγ)) and σ² = J²C_E τ(ν_ext + ν(1 + g²γ)), and the stationary rate is the fixed point ν = φ(μ(ν), σ(ν)) of (2) (Brunel 2000, eqs. 4–5), found by Brent's method.

**Quadratic integrate-and-fire neurons.** For τ v′ = v² + η + Jτ s(t) with Lorentzian η of centre η̄ and half-width Δ, the population's rate r and mean potential v obey exactly, in the limit of many neurons (Montbrió, Pazó and Roxin 2015),

$$\tau \dot r = \frac{\Delta}{\pi\tau} + 2rv, \qquad \tau\dot v = v^2 + \bar\eta + J\tau r - (\pi\tau r)^2. \tag{3}$$

## 7. What the Checks Show

- Exactness: postsynaptic potentials and currents against closed forms to 10⁻¹² of their peaks; a population and physis's simulation of one neuron fire at the same steps.
- Firing patterns of the adaptive exponential model (Brette and Gerstner 2005) as Naud et al. (2008) list them, and of Izhikevich's model (2003); the Hodgkin–Huxley neuron (1952) at rest at −65.000 mV and firing at 69 Hz under 10 µA/cm² with two integrators.
- Determinism across 1, 4 and 7 threads (Proposition 3).
- Plasticity against its defining sums, to the precision of the stored weights.
- Neurons in white noise at 2.7 % below (2), as the grid predicts; Brunel's network (g = 5, η = 2, C_E = 500) at 55.1 Hz against its self-consistent 54.9 Hz; quadratic neurons at 126 Hz against the 128 Hz of (3).
