---
title: Networks of Spiking Neurons, Exactly and in Parallel
status: draft
implemented-by:
  - domains/neuroscience/snn/include/neuroscience/snn/model.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/population.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/network.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/synapses.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/theory.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/models/excitability.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/models/quantum.hpp
  - domains/neuroscience/snn/include/neuroscience/snn/analysis.hpp
references: [RotterDiesmann1999, VanLoan1978, Morrison2005, Morrison2008, Gutig2003, Song2000, vanRossum2000, PfisterGerstner2006, TsodyksMarkram1997, Markram1998, Siegert1951, Brunel2000, BrunelChance2001, MontbrioPazoRoxin2015, BretteGerstner2005, Naud2008, Izhikevich2003, HodgkinHuxley1952, Salmon2011, Hodgkin1948, RinzelErmentrout1998, Goebel2012, Izhikevich2007, WangBuzsaki1996, MorrisLecar1981, FitzHugh1961, Nagumo1962, Higuchi2024, GoriniKossakowskiSudarshan1976, Lindblad1976, DalibardCastinMolmer1992, Carmichael1993, PlenioKnight1998, SoftkyKoch1993, Holt1996, ShinomotoShimaTanji2003, Fano1947, Golomb2007, Welch1967]
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

*Remark (an oscillator whose damping varies).* The balanced resonate-and-fire neuron (Higuchi et al. 2024) is not linear: its damping b = −b′ − Δ_b q depends on its refractoriness q, which over a step decays as q₀e^{−t/τ_q}. Its complex state obeys the scalar equation z′ = (b(t) + iω) z + u/C, whose free solution is z₀ exp(∫₀ʰ (b + iω) dt) exactly, since scalars commute; the input term is integrated with the step's mean of b, so the step is exact while q is still and of second order in h while it decays. Under Euler's step z ← z + h(b + iω) z the amplification |1 + h(b + iω)| exceeds 1 unless b < p(ω) = (−1 + √(1 − h²ω²))/h, the divergence boundary that Higuchi et al. build into b; the exact flow is stable for every b ≤ 0, and p(ω) → 0 as h → 0.

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

## 7. Classes of Excitability

Hodgkin (1948) found two kinds of axon under steady currents: in class 1 the repetitive firing begins at an arbitrarily low rate, which grows continuously with the current; in class 2 it begins at a rate bounded away from zero. Rinzel and Ermentrout (1998) traced the difference to the bifurcation in which the resting state is lost as the current I grows.

**Definition 2 (steady-state current).** For a model whose gates x_j relax to x_{j,∞}(V), the steady-state current is I_ss(V) = I_ion(V, x_∞(V)); the equilibria under a constant current I are the solutions of I_ss(V) = I, and the resting state is the lowest.

**Proposition 5 (class 1).** Suppose the resting state meets a saddle where I_ss has its first local maximum I_SN (a saddle-node bifurcation), and the unstable manifold of the saddle closes into an invariant circle (SNIC). Near the fold the flow on the centre manifold is u′ = α(I − I_SN) + βu² + O(u³, (I − I_SN)u), with αβ > 0, and for small I − I_SN > 0 the neuron fires with period

$$T = \frac{\pi}{\sqrt{\alpha\beta\,(I - I_{SN})}} + O(1). \tag{4}$$

*Proof.* The time spent near the fold is ∫ du / (αΔI + βu²) over a neighbourhood of u = 0, which tends to the integral over ℝ, π/√(αβΔI), as ΔI → 0; the rest of the circle is passed in a time bounded independently of ΔI. ∎

So four times the excess current halves the period. For Izhikevich's quadratic model (2007), C V′ = k(V − V_r)(V − V_t) − U + I with U′ = a(b(V − V_r) − U), the equilibria have U = b(V − V_r), so I_ss(V) = −k(V − V_r)(V − V_t − b/k), a parabola whose maximum is the rheobase

$$I_{SN} = \frac{(k(V_t - V_r) + b)^2}{4k}, \tag{5}$$

51.4 pA for the regular-spiking neuron. For Wang and Buzsáki's interneuron (1996) and for Morris and Lecar's fibre (1981) with Rinzel and Ermentrout's SNIC parameters, I_SN is found by scanning I_ss.

**Class 2.** For a planar model (V, w) the resting state, a stable focus, loses its stability where the trace of the Jacobian along the branch of equilibria vanishes while its determinant is positive: a pair of eigenvalues crosses the imaginary axis (a Hopf bifurcation, at I_H). The oscillation it gives begins at a finite frequency; if the bifurcation is subcritical, as with Morris and Lecar's Hopf parameters, the neuron jumps to a large cycle which coexists with the resting state somewhat below I_H. For FitzHugh and Nagumo's model, v′ = v − v³/3 − w + I, w′ = ε(v + a − bw), the Jacobian at an equilibrium (v*, w*) is [[1 − v*², −1], [ε, −εb]], with trace 1 − v*² − εb and determinant ε(1 − b(1 − v*²)), so

$$v^* = -\sqrt{1 - \varepsilon b}, \qquad I_H = \frac{v^* + a}{b} - v^* + \frac{v^{*3}}{3}, \tag{6}$$

0.33128 for a = 0.7, b = 0.8, ε = 0.08.

*Remark (counting broad spikes).* A spike of a conductance model is the upward crossing of V_spike. A guard {V ≥ V_spike} tested on the grid would count every step of a broad spike, so the guard is given hysteresis by a discrete component, armed ∈ {0, 1}: G = {V ≥ V_spike, armed = 1}, the jump sets armed = 0, and a silent jump, one that emits no event, sets armed = 1 whenever V < V_rearm. This is a hybrid system with two jump sets (Goebel, Sanfelice and Teel 2012), only one of them observed; physis's simulation and the network apply the silent jump at the same point of the step, so that they still agree.

## 8. Quantum Neurons

An open quantum system's density matrix obeys the GKSL master equation, ρ′ = −i[H, ρ] + Σ_k (L_k ρ L_k† − {L_k†L_k, ρ}/2) (Gorini, Kossakowski and Sudarshan 1976; Lindblad 1976). For a driven two-level emitter, with H = −Δ|e⟩⟨e| + (Ω/2)(|e⟩⟨g| + |g⟩⟨e|) and L = √γ σ₋, the equation is affine on the Bloch vector (physis `quantum`), and its stationary rate of emission is R = γρ_ee = γ(Ω²/4)/(Δ² + γ²/4 + Ω²/2).

**Definition 3 (quantum trajectory).** With every jump detected, the master equation unravels into pure states (Dalibard, Castin and Mølmer 1992; Carmichael 1993): between detections the unnormalised amplitudes evolve by c′ = −iH_eff c, H_eff = H − (iγ/2)|e⟩⟨e|, and |c(t)|² is the probability that none has occurred; at a detection the state jumps to |g⟩. The average over trajectories of |c⟩⟨c|/|c|² is ρ.

A detection is thus an escape event whose cumulative hazard is Λ(t) = −ln |c(t)|², exactly. The quantum emitter of the module carries its normalised amplitudes and Λ₀, renormalising after each step (a silent jump) and moving −ln |c|² into Λ₀, so that Λ = Λ₀ − ln |c|² is unchanged; it fires within a step with probability 1 − exp(−ΔΛ), exactly, and its state is advanced by exp(−iH_eff h), a 2 × 2 exponential computed in closed form.

**Proposition 6 (the grid and the master equation).** From |g⟩ let S(t) = |c(t)|². On the grid the interval between detections is j steps with probability S((j − 1)h) − S(jh), so the mean interval is h Σ_{j≥0} S(jh) = 1/R + h/2 + O(h⁴).

*Proof.* The photons form a renewal process, each interval beginning in |g⟩, so the stationary rate is the inverse mean interval ∫₀^∞ S dt, which is therefore 1/R. By Euler and Maclaurin, h Σ_{j≥0} S(jh) = ∫₀^∞ S dt + hS(0)/2 − h²S′(0)/12 + O(h⁴), with S(0) = 1 and S′(0) = −γ|c_e(0)|² = 0. ∎

On resonance S has a closed form (Plenio and Knight 1998), against which the first photons are checked; the identity ∫₀^∞ S dt = 1/R, between the unravelling and the master equation, is checked in physis. An input spike is a pulse, a rotation exp(−iθσ_x/2) of the state: θ = π excites it, after which the photon follows at the rate γ, and θ = 2π returns it to |g⟩ with its sign changed.

## 9. Describing Activity

A run's spikes are described, population by population, over a window [t₀, t₁) of length T, by statistics whose values for two reference processes are known: a Poisson process, whose intervals are independent and exponential, and a clock.

- **Irregularity.** For a neuron's intervals I₁, …, Iₙ, the coefficient of variation CV = sd(I)/mean(I) is 1 for Poisson and 0 for a clock (Softky and Koch 1993; Holt et al. 1996). It mixes irregularity with slow changes of rate, which the local variation separates: LV = 3/(n − 1) Σᵢ ((Iᵢ − Iᵢ₊₁)/(Iᵢ + Iᵢ₊₁))², again 1 for Poisson and 0 for a clock, compares only neighbouring intervals (Shinomoto, Shima and Tanji 2003).
- **Count variability.** The Fano factor (Fano 1947) of a neuron's counts in windows of length W, Var/mean, is 1 for Poisson at every W.
- **Synchrony.** With cᵢ(t) the counts of neuron i in bins of length B and c̄ = (1/N) Σ cᵢ, Golomb's measure (2007) is χ² = Var_t(c̄) / ((1/N) Σᵢ Var_t(cᵢ)). For neurons that fire together χ = 1; for independent ones Var(c̄) = (1/N²) Σ Var(cᵢ), so χ = 1/√N. The mean Pearson correlation of counts in windows of W over a sample of pairs complements it.
- **Rhythm.** The population's rate, in bins of b, has a power spectral density, estimated by Welch's method (1967) from half-overlapping Hann-windowed segments; its peak is the population's rhythm, the fast oscillation of Brunel's state SI near 180 Hz.

*Remark.* Each statistic is checked in the module against its reference processes: independent Poisson trains (CV, LV and Fano 1 within 1 %, χ√N = 1 within 1 %, correlation 0), clocks (CV, LV and Fano 0), one train shared by every neuron (χ = 1 and correlation 1 exactly), and a population whose rate oscillates at 40 Hz (the peak within a bin).

**The engine's profile.** A run advances in windows of the shortest delay (Proposition 2); each window updates the neurons on every thread, exchanges the window's spikes on one, and delivers them on every thread. The engine times each phase and each thread's share of it; the rest of a parallel phase is a thread waiting for the slowest. The profile showed the Poisson input of Brunel's network to take most of the update (each neuron's count was drawn by multiplying uniforms, with an exponential each time), and the count is now drawn by inverting a table of the Poisson distribution, one uniform per neuron and step: the network runs 1.4 times faster on one thread and 1.5 times on eight.

## 10. What the Checks Show

- Exactness: postsynaptic potentials and currents against closed forms to 10⁻¹² of their peaks; a population and physis's simulation of one neuron fire at the same steps.
- Firing patterns of the adaptive exponential model (Brette and Gerstner 2005) as Naud et al. (2008) list them, and of Izhikevich's model (2003); the Hodgkin–Huxley neuron (1952) at rest at −65.000 mV and firing at 69 Hz under 10 µA/cm² with two integrators.
- Determinism across 1, 4 and 7 threads (Proposition 3).
- Plasticity against its defining sums, to the precision of the stored weights.
- Classes of excitability: Izhikevich's 2007 model, Wang and Buzsáki's interneuron and Morris and Lecar's SNIC set are silent 0.2 % below I_SN, from (5) or from a scan of I_ss, fire 0.2 % above it, and halve their period when the excess current is multiplied by four, as (4) predicts, to within 10 %; Morris and Lecar's Hopf set and FitzHugh and Nagumo's model return from a small kick 1 % below I_H, from the Jacobian or from (6), are driven into firing 1 % above it, and begin at a rate bounded away from zero.
- The adaptive LIF's resonant free response against the exponential of its system to 4 × 10⁻¹³; the GIF neuron without kernels firing spike for spike as the escape-noise LIF under the same seed, and its kernels against their closed forms; the BRF neuron exact while its refractoriness is still, of second order while it decays, rotating without loss for 10 s when undamped, and selective for its own frequency.
- Quantum emitters: their first photons against the closed-form waiting time, exact on the grid; their rate against Proposition 6; the average of 20,000 trajectories against the master equation; pulses of π and 2π.
- The statistics of activity against Poisson trains, clocks, shared trains and an oscillating population; the engine's profile accounting for its run to 5 %.
- Neurons in white noise at 2.7 % below (2), as the grid predicts; Brunel's network (g = 5, η = 2, C_E = 500) at 55.1 Hz against its self-consistent 54.9 Hz; quadratic neurons at 126 Hz against the 128 Hz of (3).
