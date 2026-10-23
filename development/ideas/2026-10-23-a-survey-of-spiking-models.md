---
title: A survey of spiking neuron models, learning rules and quantum neuromorphic models
status: seed
date: 2026-10-23
---

# A Survey of Spiking Neuron Models, Learning Rules and Quantum Neuromorphic Models

*Compiled on 2026-10-23 for the planning of the `snn` module (decision 0002), at the user's request for a survey of new models, by a research agent of the session: every DOI resolved on Crossref and every arXiv identifier on arXiv; equations tagged by how they were checked (§0). It is the plan of what the module implements next; each model, when written, cites its paper in its code and is checked against the paper before its tests are written, as §0 advises.*

*Written (2026-10-23):* GIF (§2.2), AdLIF with its exact flow (§1.3), BRF (§1.4), Izhikevich's dimensional model, Wang–Buzsáki, Morris–Lecar and FitzHugh–Nagumo (§2.4), as `snn`'s `gif`, `adlif`, `brf`, `izhikevich_2007`, `wang_buzsaki`, `morris_lecar` and `fitzhugh_nagumo`; and, of the open-system models of §4.2, the simplest exact one, a driven two-level emitter followed along quantum trajectories with its photons as spikes (`quantum_emitter`, on physis's new `quantum` module). BRF's equations were read from the paper; the [K] equations of the classical models were not re-read, but checked by the bifurcations their classes require, computed from the models' own equations and then met by the simulations: a saddle-node at 0.160 µA/cm² for Wang–Buzsáki and at 39.96 µA/cm² for the [K?] Morris–Lecar SNIC set, and a Hopf bifurcation at 93.86 µA/cm² for its Hopf set ([theory](../../theory/spiking-networks.md), §7).

## 0. Method and Conventions

**How the survey was checked (2026-10-23).**
- Every DOI was resolved against the Crossref API, and title, authors, year and venue matched.
- Every arXiv identifier was checked on its arxiv.org abstract page.
- For the post-2019 machine-learning neurons, the quantum neurons and the Gast et al. mean-field model, I downloaded the authors' arXiv LaTeX sources and read the equations directly. The Loihi neurons were read from the Lava source code (`lava-nc/lava`, `src/lava/proc/{lif,sdn}/models.py`).

**Tags used in each entry.**
- **[C]** DOI verified on Crossref.
- **[A]** arXiv identifier verified.
- **[S]** equations transcribed from the authors' source or code in this session.
- **[K]** equations given from standard knowledge and not re-read here. These are well-established forms, but check them against the paper before writing tests.
- **[K?]** parameter values I am less sure of. Treat them as unverified until compared with the paper.

**Citations.** Every citation below is verified. The only unverified items are some venue claims, which are marked where they occur.

**Terms.**
- "Exact" means linear or affine between events with piecewise-constant coefficients, so the propagator is $e^{Ah}$, with an augmented matrix for the affine case.
- "DT" means the model is defined in discrete time. Its "time constants" are in units of steps; the decay factor is $\beta=e^{-h/\tau}$.
- Many deep-SNN papers write the forward-Euler form $V\leftarrow V+\tfrac1\tau(-V+X)$. Its exact counterpart is $V\leftarrow\beta V+(1-\beta)X$, the same family under the reparametrisation $1/\tau\mapsto 1-e^{-h/\tau}$.

**Implementation advice.** Implement a DT model as a "map neuron", a per-step state update, whenever no continuous parent exists. Where a continuous parent exists, implement the exact parent and offer a "paper-reproduction" DT mode beside it.

---

## 1. Point Neurons from Deep SNNs and Neuromorphic Engineering (2019–2026)

### 1.1 Parametric LIF (PLIF)

Fang, Yu, Chen, Masquelier, Huang, Tian, *ICCV 2021*, pp. 2641–2651. DOI 10.1109/ICCV48922.2021.00266 [C]; arXiv:2007.05785 [A]. Equations [S].

- **Equations (DT, dimensionless).**
  - Membrane: $H_t=V_{t-1}+k(a)\,(-(V_{t-1}-V_{\rm reset})+X_t)$.
  - Spike: $S_t=\Theta(H_t-V_{th})$.
  - Hard reset: $V_t=H_t(1-S_t)+V_{\rm reset}S_t$.
  - $k(a)=\mathrm{sigmoid}(a)$, so $\tau=1/k\in(1,\infty)$. There is one learnable $a$ per layer.
- **Defaults.** $V_{th}=1$, $V_{\rm reset}=0$, initial $\tau_0=2$. Surrogate $\sigma(x)=\tfrac1\pi\arctan(\pi x)+\tfrac12$. The reset is detached from the gradient graph.
- **Integration.** Forward-Euler LIF; the exact version is the reparametrisation above. In your library this is LIF with $\tau$ as a learnable parameter, with no new dynamics.
- **Why it matters.** It is the default neuron in SpikingJelly and one of the most-used deep-SNN neurons.

### 1.2 Gated LIF of Yao et al. (Distinct from Allen GLIF)

Yao, Li, Mo, Cheng, *NeurIPS 2022* (venue per arXiv comment). arXiv:2210.13768 [A]. Equations [S].

- **Equations (DT).**
  - Membrane: $U^t=L^t+I^t+F^t\odot S^{t-1}$, with $C^t=W S^{t,l-1}$ and $S^t=\mathbb H(U^t-V_{th})$.
  - Leak gate: $L^t=[1-\alpha(1-\tau_{\rm exp})]U^{t-1}-(1-\alpha)\tau_{\rm lin}$. This mixes exponential and subtractive (linear) leak.
  - Input gate: $I^t=[1-\beta(1-g^t)]C^t$, where $g^t$ is a per-time-step gain.
  - Reset gate: $F^t=-\gamma L^t_{\rm exp}-(1-\gamma)V_{re}$, with $L^t_{\rm exp}=[1-\alpha(1-\tau_{\rm exp})]U^{t-1}$. Here $\gamma\to1$ gives a hard reset and $\gamma\to0$ a soft one.
- **Parameters.** All of $\tau_{\rm lin},\tau_{\rm exp},V_{re},g^t,V_{th},\alpha,\beta,\gamma$ are a sigmoid of a learnable parameter, shared per channel. $(\alpha,\beta,\gamma)=(1,0,1)$ recovers vanilla LIF.
- **Integration.** Affine between spikes, so exact; the linear leak is a constant drift. The reset is an affine map, which fits your reset-map abstraction.
- **Origin of the linear leak.** It is TrueNorth's subtractive leak: Cassidy et al., IJCNN 2013, DOI 10.1109/IJCNN.2013.6707077 [C].
- **Use.** Moderate, mainly in image-classification SNNs.

### 1.3 Adaptive LIF with Subthreshold Coupling (AdLIF, SE-AdLIF, SiLIF)

**Bittar & Garner 2022.** *Front. Neurosci.* 16:865897, DOI 10.3389/fnins.2022.865897 [C]. Equations [K], in the form restated by the SiLIF paper [S]:
- $u_t=\alpha u_{t-1}+(1-\alpha)(I_t-w_{t-1})-\theta s_{t-1}$
- $w_t=\beta w_{t-1}+(1-\beta)(a u_{t-1}+b s_{t-1})$
- $s_t=H(u_t-\theta)$

**Baronig, Ferrand, Sabathiel, Legenstein.** *Nat. Commun.* 16:5776 (2025), per arXiv's journal reference; arXiv:2408.07517 [A]. Equations [S].
- **Continuous model.**
  - $\tau_u\dot u=-u+I-w$
  - $\tau_w\dot w=-w+a u+b z$
  - $a$ and $b$ are dimensionless; $w$ has the units of $u$.
- **EF-adLIF (forward Euler).**
  - $\hat u[k]=\alpha u[k-1]+(1-\alpha)(-w[k-1]+I[k])$
  - $w[k]=\beta w[k-1]+(1-\beta)(a u[k-1]+bS[k])$
  - $S=H(\hat u-u_{th})$, then $u=\hat u(1-S)$.
- **SE-adLIF (symplectic Euler).** The same, except that $w$ uses the new $u[k]$.
- **Their reason for SE.** They note that the exact solution needs a matrix exponential, and they choose SE for its stability (the eigenvalues stay inside the unit disc).
- **Example parameters.**
  - Stability study: $\tau_u=25$ ms, $\tau_w=60$ ms, $a=120$.
  - Training: $a,b>0$ via clipped reparametrisations, $\hat a\in[0,1]$ and $\hat b\in[0,2]$.

**SiLIF and C-SiLIF.** Fabre, Dudchenko, Bouhadjar, Neftci, arXiv:2506.06374 [A] (2025; venue not confirmed). Equations [S].
- The same AdLIF in state-space form.
- It trains $\lambda_\alpha=1/\tau_u$, $\lambda_\beta=1/\tau_w$ and a per-neuron $\Delta t$ in log space, S4-style: $\alpha=\exp(-e^{\lambda^\alpha_{\log}}e^{\Delta t_{\log}})$.
- C-SiLIF uses a complex scalar state.

**Integration.** A 2-D linear time-invariant system, so exact through a 2×2 matrix exponential. Exact integration removes the EF-versus-SE stability question entirely. For large $a$ the eigenvalues are complex, which gives subthreshold resonance.

**Why it matters.** AdLIF and SE-AdLIF are among the strongest recurrent SNN neurons on SHD, SSC and ECG. The model is AdEx without the exponential term; you have AdEx already.

**Related variant.** Yin, Corradi, Bohté, *Nat. Mach. Intell.* 3:905 (2021), DOI 10.1038/s42256-021-00397-w [C]: ALIF with learnable $\tau_m$ and $\tau_{adp}$, a variant of your Bellec ALIF.

### 1.4 Complex Resonate-and-Fire Neurons

**(a) Balanced resonate-and-fire (BRF) and balanced harmonic RF (BHRF).** Higuchi, Kairat, Bohté, Otte, *ICML 2024* (per arXiv comment). arXiv:2402.14603 [A]. Equations [S].
- **Base model.** $\dot u=(b+i\omega)u+I$, with $u\in\mathbb C$. The paper uses the Euler step $u_t=u_{t-\delta}+\delta((b+i\omega)u_{t-\delta}+I_t)$.
- **BRF additions.**
  - Spike: $z=\Theta(\mathrm{Re}\,u-\vartheta)$, with $\vartheta=\vartheta_c+q$.
  - Refractory variable: $q_t=\gamma q_{t-\delta}+z_{t-\delta}$, default $\gamma=0.9$.
  - "Smooth reset": $b(t)=b_c-q(t)$. There is no jump in $u$.
  - Divergence boundary: $b_c=p(\omega)-b'$, with $p(\omega)=(-1+\sqrt{1-(\delta\omega)^2})/\delta$ and $b'>0$ learnable. It requires $\omega\le1/\delta$; the default $\delta=0.01$.
- **BHRF.** $\dot u=-2bu-\omega^2v+I$, $\dot v=u$, with an empirical boundary $p(\omega)=\omega^2/200$.
- *Remark (consequence for exact integration).* The divergence boundary is an artefact of forward Euler. The exact factor $|e^{(b+i\omega)h}|=e^{bh}<1$ for every $b<0$, so no boundary is needed; only aliasing limits $\omega$, to $\omega<\pi/h$.
  - With $q$ piecewise constant per step, the per-step propagator is exact.
  - In continuous time, with $\dot q=-q/\tau_q$, the homogeneous solution has the closed form $u_0\exp\!\big((b_c+i\omega)t-q_0\tau_q(1-e^{-t/\tau_q})\big)$.
  - To reproduce the paper's numbers, implement the Euler map as a DT model.

**(b) Loihi 2 resonate-and-fire.**
- Sources: Frady et al., *J. Signal Process. Syst.* 94:917 (2022), DOI 10.1007/s11265-022-01772-5 [C]; Orchard et al. arXiv:2111.03746 [A]; Shrestha et al. arXiv:2310.03251 [A]. Equations [S].
- Update: $z[t]=\lambda e^{i\omega}z[t-1]+a$, where the input $a$ is complex.
- Spike: when the state crosses a phase half-plane (for example $\mathrm{Im}\,z>\vartheta$) or when $\mathrm{Re}\,z>\vartheta$. The reset is optional.
- This is exactly the zero-order-hold (ZOH) step of (a).

**(c) Parallel resonate-and-fire (PRF).** Huang et al., arXiv:2410.03530 [A]; venue not found. Equations [S].
- Update: $\tilde u_t=e^{\Delta\tilde\gamma}\tilde u_{t-1}+\Delta c_t$, with $\tilde\gamma=\gamma+i\theta$.
- Spike: $s_t=H(\mathrm{Re}\,\tilde u_t-V_{th})$.
- There is no reset; the rotation $\theta$ replaces it.
- The paper also proposes a "decoupled reset" for LIF:
  - $s_t=H(u'_t-d_t)$, with $d_t=V_{th}(A_t+1)$;
  - $A_t=\beta(s_{t-1}+A_{t-1})$.

**(d) Dendritic resonate-and-fire (D-RF).** Zhang et al., arXiv:2509.17186 [A] (2025; written on the NeurIPS template, acceptance not verified). Equations [S].
- Branches: $\dot z_i=(-1/\tau_i+i\omega_i)z_i+\gamma_iI$.
- Soma: $H=\sum_iC_i\mathrm{Re}\,z_i$ and $S=\Theta(H-V_{th}[t])$.
- The threshold adapts to the recent threshold crossings of the branch states.

**(e) Phase state-space models (φ-SSM).** Olin-Ammentorp, ICONS 2026, DOI 10.1145/3822454.3822484 [C]; arXiv:2608.07754 [A]. Built on R&F neurons. I did not read its equations.

**Why they matter.** Resonators are Loihi 2's native frequency-selective unit, and BRF converges fast with sparse spiking. One implementation covers (a)–(d): a complex state with an exact propagator, an auxiliary jump variable $q$, and an optional reset.

### 1.5 Linear Multi-Compartment Neurons

**(a) TC-LIF.** Zhang, Yang, Ma, Wu, Li, Tan, *AAAI* 38(15):16838 (2024), DOI 10.1609/aaai.v38i15.29625 [C]; arXiv:2308.13250 [A]. Equations [S].
- **General two-compartment form (DT).**
  - Dendrite: $U^D_t=\alpha_1U^D_{t-1}+\beta_1U^S_{t-1}+I_t$
  - Soma: $U^S_t=\alpha_2U^S_{t-1}+\beta_2U^D_t-V_{th}S_{t-1}$
- **TC-LIF sets $\alpha_1=\alpha_2=1$.**
  - Dendrite: $U^D_t=U^D_{t-1}+\beta_1U^S_{t-1}+I_t-\gamma S_{t-1}$
  - Soma: $U^S_t=U^S_{t-1}+\beta_2U^D_t-V_{th}S_{t-1}$
  - $\beta_1=-\sigma(c_1)$ and $\beta_2=\sigma(c_2)$ are learnable.
  - $\gamma$ scales a back-propagating-spike reset of the dendrite.
- It is inspired by Pinsky–Rinzel. Both resets are spike-triggered state jumps, which matches your receptor-jump mechanism.

**(b) PMSN.** Chen, Wu, Ma, Yan et al., *IEEE TNNLS* (2026), DOI 10.1109/TNNLS.2026.3708510 [C]; arXiv:2408.14917 [A]. Equations [S].
- **General model.** $\dot{\mathcal V}=T\mathcal V+\gamma I$ with $T$ tridiagonal: $-1/\tau_i$ on the diagonal and couplings $\beta_{i,j}$ off it. A spike fires when $v^{(n)}\ge\theta$, followed by a subtractive reset.
- **PMSN itself.**
  - The $n-1$ hidden compartments are linear time-invariant. $T=P\Lambda P^{-1}$ is diagonalised (complex), and ZOH gives $V_h[t]=e^{\Lambda dt}V_h[t-1]+\Phi_cI[t]$.
  - The input to the output compartment is $I_h=\Phi_sV_h+\gamma_nI$.
  - Output compartment: $v_s[t]=v_s[t-1]+I_h[t]-v_r[t-1]$ and $S=H(v_s-\theta)$.
  - Reset: $v_r[t]=S[t]\,\theta\lfloor v_s/\theta\rfloor$. This "temporal-decoupled reset" removes an integer multiple of $\theta$; it needs a ReLU on $I_h$ for the parallel form to be equivalent.
- **Special cases.** $n=1,\beta=0$ gives LIF; $n=2,\gamma_2=0$ gives TC-LIF.

**(c) DH-SNN.** Zheng et al., *Nat. Commun.* 15:277 (2024), DOI 10.1038/s41467-023-44614-z [C]. Equations [K].
- Several dendritic branches, each a first-order filter with its own learnable timing factor, summed into a LIF soma.

**Integration.** All three are linear, so exact through a block matrix exponential. Generalising your "receptors" to a linear compartment matrix $A$ with input map $B$ and readout $c$ subsumes all three.

### 1.6 Spiking State-Space Models

- **SpikingSSMs.** Shen et al., *AAAI* 39(19):20380 (2025), DOI 10.1609/aaai.v39i19.34245 [C]; arXiv:2408.14909 [A]. Equations [S].
  - S4D layer: $h_t=\bar Ah_{t-1}+\bar Bx_t$, $y_t=Ch_t$.
  - LIF on its output: $u'_t=\tau u_{t-1}+y_t$, $s_t=H(u'_t-v_{th})$, with a soft or hard reset. Here $\tau$ is a decay factor.
  - The threshold is learnable. A "surrogate dynamic network" predicts the spikes in parallel, but only during training.
- **Stan & Rhodes.** *Sci. Rep.* 14:21957 (2024), DOI 10.1038/s41598-024-71678-8 [C]; arXiv:2401.00955 [A]. Equations [S].
  - S4 layers with bilinear discretisation, $\bar A=(I-\tfrac\Delta2A)^{-1}(I+\tfrac\Delta2A)$.
  - LIF neurons with a soft reset between the layers.
- **P-SpikeSSM.** Bal & Sengupta, *ICLR 2025* (per arXiv comment and ICLR poster page); arXiv:2406.02923 [A]. Equations [S].
  - $\dot h=Ah+Bx$ and $p_s=\mathrm{clamp}(aCh+b)$.
  - Spiking is stochastic: $S_t=\mathbb 1[z<p_s]$ with $z\sim U(0,1)$. There is no reset, and the discretisation is bilinear.
- **SPikE-SSM.** Zhong et al., arXiv:2410.17268 [A]; IEEE TCDS 2026 per arXiv's journal reference, DOI not checked. A reset-refractory neuron with trainable thresholds; equations not transcribed.
- **MIMO spiking neurons.** Karilanova, Dey, Özçelikkale, NICE 2025, arXiv:2504.02591 [A].

**Integration.** The SSM part is linear. Use exact ZOH, and note that it gives different numbers from the bilinear rule at large $\Delta$. The spiking stage is a threshold, or a hazard in the stochastic case. This is the same machinery as §1.5.

### 1.7 Reset-Free and Gradient-Oriented Variants

**Parallel spiking neurons (PSN).** Fang et al., *NeurIPS 2023* (per arXiv comment); arXiv:2304.12760 [A]. Equations [S].
- Full form: $H=WX$ with $W\in\mathbb R^{T\times T}$, and $S=\Theta(H-B)$.
- Masked form: $W\odot M_k$.
- Sliding form: $H[t]=\sum_{i=0}^{k-1}W_iX[t-k+1+i]$.
- There is no state and no reset. It is a learnable finite-impulse-response (FIR) filter followed by a threshold, not a hybrid system.

**Complementary LIF (CLIF).** Huang et al., *ICML 2024*, PMLR 235:19949–19972 (venue confirmed on the PMLR page); arXiv:2402.04663 [A]. Equations [S].
- $u_t=(1-1/\tau)u_{t-1}+c_t$ and $s=\Theta(u-V_{th})$.
- $m_t=m_{t-1}\odot\sigma(u_t/\tau)+s_t$.
- Reset: $u\leftarrow u-s\,(V_{th}+\sigma(m_t))$.
- It is nonlinear and defined only in discrete time.

**KLIF.** arXiv:2302.09238 [A]. Its learnable surrogate slope matters only for training.

### 1.8 Neuromorphic Hardware Neurons

**Loihi current-based LIF (CUBA).** Davies et al., *IEEE Micro* 38:82 (2018), DOI 10.1109/MM.2018.112130359 [C]; Lava code [S].
- Update: $u\leftarrow u(1-d_u)+a_{\rm in}$; $v\leftarrow v(1-d_v)+u+\text{bias}$; spike if $v>v_{th}$; then $v\leftarrow0$.
- Fixed-point variant:
  - 12-bit $d_u$ and $d_v$, so the decay is $(4096-d)/4096$;
  - 24-bit states;
  - the threshold is shifted left by 6 bits.
- There is also a ternary LIF, with two thresholds and spikes of ±1.

**Sigma-delta neuron.** O'Connor & Welling, arXiv:1611.02024 [A]; Shrestha et al. 2023 [S]; Lava `sdn` [S].
- Sigma: $\Sigma_t=\Sigma_{t-1}+a_{\rm in}$, then $\text{act}=\mathrm{ReLU}(\Sigma+\text{bias})$.
- Delta: $\Delta=\text{act}_t-\text{act}_{\rm ref}+\text{residue}$. Send $s=\Delta$ if $|\Delta|\ge v_{th}$, else 0. Then residue $=\Delta-s$.
- Paper form: $s_t=(x_t-x^{\rm ref}_{t-1})H(|x_t-x^{\rm ref}_{t-1}|-\vartheta)$ and $x^{\rm ref}_t=x^{\rm ref}_{t-1}+s_t$.
- Spikes are graded, up to 24 bits on Loihi 2. Related: Brehove et al., arXiv:2505.06417 [A], on converting networks to sigma-delta form on Loihi 2.

**Analogue DPI / AdExp-I&F neurons.** Chicca, Stefanini, Bartolozzi, Indiveri, *Proc. IEEE* 102:1367 (2014), DOI 10.1109/JPROC.2014.2313954 [C]. Equations [K].

**Heterogeneity.** Perez-Nieves, Leung, Dragotti, Goodman, *Nat. Commun.* 12:5791 (2021), DOI 10.1038/s41467-021-26022-3 [C]. Learning per-neuron $\tau_m$ and $\tau_{syn}$ improves robustness. This argues for per-neuron, not per-population, time constants.

---

## 2. Computational-Neuroscience Neuron Models

### 2.1 Two-Compartment and Dendritic Models

**(a) Pinsky–Rinzel.** *J. Comput. Neurosci.* 1:39 (1994), DOI 10.1007/BF00962717 [C].
- **Equations [K].** Two compartments, with soma fraction $p$:
  - Soma: $C_m\dot V_s=-I_L-I_{Na}-I_{K\text{-}DR}+\tfrac{g_c}{p}(V_d-V_s)+\tfrac{I_s}{p}$
  - Dendrite: $C_m\dot V_d=-I_L-I_{Ca}-I_{K\text{-}AHP}-I_{K\text{-}C}-\tfrac{I_{syn}}{1-p}+\tfrac{g_c}{1-p}(V_s-V_d)+\tfrac{I_d}{1-p}$
  - The calcium pool is driven by $I_{Ca}$.
- **Parameters [K?].**
  - $p=0.5$, $g_c=2.1$ mS/cm², $C_m=3$ µF/cm².
  - $g_{Na}=30$, $g_{K\text{-}DR}=15$, $g_{Ca}=10$, $g_{K\text{-}AHP}=0.8$, $g_{K\text{-}C}=15$, $g_L=0.1$ mS/cm².
  - $E_{Na}=120$, $E_K=-15$, $E_{Ca}=140$, $E_L=0$ mV, relative to rest.
- **Integration.** Nonlinear; needs a numerical integrator.
- **Why it matters.** The canonical reduction of bursting CA3 cells, and the inspiration for TC-LIF.

**(b) Naud–Sprekeler burst neuron.** *PNAS* 115:E6329 (2018), DOI 10.1073/pnas.1720995115 [C]; it builds on Naud, Bathellier, Gerstner, *Front. Comput. Neurosci.* 8:90 (2014), DOI 10.3389/fncom.2014.00090 [C].
- **Equations [K].**
  - Soma: $C_s\dot V_s=-\tfrac{C_s}{\tau_s}(V_s-E_L)+g_sf(V_d)+I_s+w_s$, with $\tau_{ws}\dot w_s=-w_s+b\tau_{ws}\sum\delta(t-\hat t)$.
  - Dendrite: $C_d\dot V_d=-\tfrac{C_d}{\tau_d}(V_d-E_L)+g_df(V_d)+c_dK(t-\hat t)+I_d+w_d$, with $\tau_{wd}\dot w_d=-w_d+a(V_d-E_L)$.
  - Dendritic nonlinearity: $f(x)=1/(1+e^{-(x-E_d)/D_d})$.
- **Parameters, as listed in the Methods of Payeur et al. 2021 [S from text].**
  - Soma: $\tau_s=16$ ms, $C_s=370$ pF, $E_L=-70$ mV, $b=200$ pA, $g_s=1300$ pA. The reset is to −70 mV; the threshold jumps 2 mV per spike and relaxes to −50 mV with a 27 ms time constant.
  - Dendrite: $\tau_d=7$ ms, $C_d=170$ pF, $a=13$ nS, $g_d=1200$ pA, $E_d=-38$ mV, $D_d=6$ mV.
  - The back-propagating-spike kernel $K$ is a box of amplitude 1 lasting 2 ms, delayed 0.5 ms.
- **Burst and event.** A burst is two or more spikes with interspike intervals under 16 ms. An event is an isolated spike or a burst.
- **Integration.** The soma is linear given $f(V_d)$. The dendrite is nonlinear, so use RK4 or exponential Euler there. The box kernel is exact on the grid if 0.5 ms and 2 ms are multiples of $h$.
- **Why it matters.** It multiplexes bursts and events, models BAC firing (Larkum, Zhu, Sakmann, *Nature* 398:338, 1999, DOI 10.1038/18686 [C]), and is needed for burst-dependent plasticity.

**(c) Urbanczik–Senn neuron.** *Neuron* 81:521 (2014), DOI 10.1016/j.neuron.2013.11.030 [C]. Equations [K].
- Soma: $\dot U=-g_LU+g_D(V_w-U)+g_E(E_E-U)+g_I(E_I-U)$, with dendrite $V_w=\sum_iw_i\,\mathrm{PSP}_i$.
- Spikes are Poisson with rate $\varphi(U)$.
- Dendritic prediction: $V^*_w=\tfrac{g_D}{g_L+g_D}V_w$.
- **Integration.** Linear conductance-based membrane; spikes by hazard.

**(d) Sacramento et al.** NeurIPS 2018, arXiv:1810.11393 [A]. Multi-compartment, rate-based microcircuits that approximate backpropagation.

### 2.2 Escape-Noise, GLM and Spike-Response Models

**(a) Generalized integrate-and-fire with escape noise (GIF).**
- Sources: Mensi et al., *J. Neurophysiol.* 107:1756 (2012), DOI 10.1152/jn.00408.2011 [C]; Pozzorini et al., *Nat. Neurosci.* 16:942 (2013), DOI 10.1038/nn.3431 [C]; Pozzorini et al., *PLoS Comput. Biol.* 11:e1004275 (2015), DOI 10.1371/journal.pcbi.1004275 [C].
- **Equations [K].**
  - Membrane: $C\dot V=-g_L(V-E_L)+I-\sum_{\hat t}\eta(t-\hat t)$.
  - Hazard: $\lambda=\lambda_0\exp((V-V_T(t))/\Delta V)$, with moving threshold $V_T=V_T^*+\sum_{\hat t}\gamma(t-\hat t)$.
  - After a spike: $V\leftarrow V_r$, then an absolute refractory period.
  - The kernels $\eta$ and $\gamma$ are expanded in a basis: rectangular (2015), power-law (2013) or sums of exponentials.
- **Integration.** Linear between spikes when the kernels are exponential. The spike probability per step is $1-e^{-\lambda h}$.
- **Why it matters.** It is the standard model fitted to single cells, and Schwalger et al. 2017 build mesoscopic population theory on it. It composes pieces you already have (MAT2, GLIF, escape noise).

**(b) Poisson GLM.** Pillow et al., *Nature* 454:995 (2008), DOI 10.1038/nature07140 [C]; Weber & Pillow, *Neural Comput.* 29:3260 (2017), DOI 10.1162/neco_a_01021 [C]. Equations [K].
- Rate: $\lambda_t=\exp(k\cdot x_t+\sum_jh_j*y_{j,t}+\mu)$, with Poisson or Bernoulli spikes.
- Filters use a raised-cosine basis, $\tfrac12\cos(a\log(t+c)-\phi_j)+\tfrac12$.
- It is discrete-time with FIR filters; the spike-history filter plays the roles of reset and refractoriness.

**(c) Spike-response model fits.** Jolivet et al., *J. Comput. Neurosci.* 21:35 (2006), DOI 10.1007/s10827-006-7074-5 [C].

**(d) Galves–Löcherbach chains.** *J. Stat. Phys.* 151:896 (2013), DOI 10.1007/s10955-013-0733-9 [C]. A discrete-time stochastic chain in which the potential resets at the neuron's own spike [K].

### 2.3 The Theta Neuron

Ermentrout & Kopell, *SIAM J. Appl. Math.* 46:233 (1986), DOI 10.1137/0146017 [C]; Ermentrout, *Neural Comput.* 8:979 (1996), DOI 10.1162/neco.1996.8.5.979 [C]. Equations [K].
- $\dot\theta=(1-\cos\theta)+(1+\cos\theta)I$; a spike is the passage of $\theta$ through $\pi$.
- With $V=\tan(\theta/2)$ it is the QIF $\dot V=V^2+I$. Your exact QIF already covers it; add it only as a reparametrised, reset-free view, useful for phase models and mean-field derivations.

### 2.4 Reduced Conductance-Based Models

All of these are nonlinear and need your HH-class integrator: RK4, or exponential Euler for the gates.

**Wang–Buzsáki interneuron.** *J. Neurosci.* 16:6402 (1996), DOI 10.1523/JNEUROSCI.16-20-06402.1996 [C]. Equations [K].
- Membrane: $C\dot V=-g_{Na}m_\infty^3h(V-E_{Na})-g_Kn^4(V-E_K)-g_L(V-E_L)+I$, with $m_\infty=\alpha_m/(\alpha_m+\beta_m)$.
- Gates: $\dot h=\phi(\alpha_h(1-h)-\beta_hh)$, and likewise for $n$, with $\phi=5$.
- Rate functions:
  - $\alpha_m=-0.1(V+35)/(e^{-0.1(V+35)}-1)$, $\beta_m=4e^{-(V+60)/18}$
  - $\alpha_h=0.07e^{-(V+58)/20}$, $\beta_h=1/(e^{-0.1(V+28)}+1)$
  - $\alpha_n=-0.01(V+34)/(e^{-0.1(V+34)}-1)$, $\beta_n=0.125e^{-(V+44)/80}$
- Parameters: $g_{Na}=35$, $g_K=9$, $g_L=0.1$ mS/cm²; $E_{Na}=55$, $E_K=-90$, $E_L=-65$ mV; $C=1$ µF/cm².
- Synapse: $\dot s=\alpha F(V_{pre})(1-s)-\beta s$, with $F=1/(1+e^{-(V_{pre}-\theta_{syn})/2})$, $\alpha=12$ ms⁻¹, $\beta=0.1$ ms⁻¹, $\theta_{syn}=0$ mV and $E_{syn}=-75$ mV.
- **Why it matters.** The standard model of interneuron-generated (ING) gamma.

**Reduced Traub–Miles (RTM) pyramidal cell.** Traub & Miles 1991 (book), DOI 10.1017/CBO9780511895401 [C]; Ermentrout & Kopell, *PNAS* 95:1259 (1998), DOI 10.1073/pnas.95.3.1259 [C]; Börgers 2017 (book), DOI 10.1007/978-3-319-51171-9 [C].
- Structure [K]: Na with instantaneous $m$, K delayed rectifier, leak.
- Parameters [K?]: $g_{Na}=100$, $g_K=80$, $g_L=0.1$ mS/cm²; $E_{Na}=50$, $E_K=-100$, $E_L=-67$ mV.
- **Why it matters.** The E cell of pyramidal–interneuron (PING) gamma models.

**Pospischil et al.** *Biol. Cybern.* 99:427 (2008), DOI 10.1007/s00422-008-0263-8 [C].
- Equations [K]: an HH model with Traub–Miles kinetics shifted by $V_T$, plus a slow M-current ($\tau_{\max}$), $I_L$ and $I_T$.
- Covers the RS, FS, IB, LTS and thalamic classes. Take the values from the paper's tables.

**Morris–Lecar.** *Biophys. J.* 35:193 (1981), DOI 10.1016/S0006-3495(81)84782-0 [C]. Equations [K].
- Membrane: $C\dot V=I-g_L(V-V_L)-g_{Ca}m_\infty(V-V_{Ca})-g_Kw(V-V_K)$.
- Recovery: $\dot w=\phi(w_\infty-w)/\tau_w$.
- $m_\infty=\tfrac12[1+\tanh((V-V_1)/V_2)]$, $w_\infty=\tfrac12[1+\tanh((V-V_3)/V_4)]$, $\tau_w=1/\cosh((V-V_3)/2V_4)$.
- Rinzel–Ermentrout (1989) parameter sets [K?], a book chapter without a DOI:
  - Hopf set: $C=20$, $g_L=2$, $g_{Ca}=4.4$, $g_K=8$, $V_L=-60$, $V_{Ca}=120$, $V_K=-84$, $V_1=-1.2$, $V_2=18$, $V_3=2$, $V_4=30$, $\phi=0.04$.
  - SNIC set: $g_{Ca}=4$, $V_3=12$, $V_4=17.4$, $\phi=1/15$.

**FitzHugh–Nagumo.** FitzHugh, *Biophys. J.* 1:445 (1961), DOI 10.1016/S0006-3495(61)86902-6 [C]; Nagumo et al., *Proc. IRE* 50:2061 (1962), DOI 10.1109/JRPROC.1962.288235 [C]. Equations [K].
- $\dot v=v-v^3/3-w+I$ and $\dot w=\varepsilon(v+a-bw)$, with $a=0.7$, $b=0.8$, $\varepsilon=0.08$.

**Hindmarsh–Rose.** *Proc. R. Soc. B* 221:87 (1984), DOI 10.1098/rspb.1984.0024 [C]. Equations [K].
- $\dot x=y-ax^3+bx^2-z+I$, $\dot y=c-dx^2-y$, $\dot z=r(s(x-x_R)-z)$.
- Commonly $a=1$, $b=3$, $c=1$, $d=5$, $s=4$, $x_R=-8/5$, with $r\approx10^{-3}$ (values vary between papers).

**Conductance-based AdEx (CAdEx).** Górski, Depannemaecker, Destexhe, *Neural Comput.* 33:41 (2021), DOI 10.1162/neco_a_01342 [C]. Equations [K?].
- AdEx in which the adaptation is a conductance $g_A$ with reversal $E_A$.
- $g_A$ relaxes to a sigmoidal function of $V$ with time constant $\tau_A$ and jumps by $\delta g_A$ at each spike.

**Izhikevich's dimensional simple model.** *Dynamical Systems in Neuroscience* (MIT Press), DOI 10.7551/mitpress/2526.001.0001 [C]. Equations [K]; the form is confirmed by its use in Gast et al. 2023 [S].
- $C\dot v=k(v-v_r)(v-v_t)-u+I$ and $\dot u=a(b(v-v_r)-u)$.
- At the peak: $v\leftarrow c$ and $u\leftarrow u+d$.

**Mihalaş–Niebur.** *Neural Comput.* 21:704 (2009), DOI 10.1162/neco.2008.12-07-680 [C]. A linear model, so exact; already covered by your Allen GLIF5.

### 2.5 Stochastic Models and Noise

**Ornstein–Uhlenbeck conductances.** Destexhe et al., *Neuroscience* 107:13 (2001), DOI 10.1016/S0306-4522(01)00344-X [C].
- The exact update (Gillespie, *Phys. Rev. E* 54:2084, 1996, DOI 10.1103/PhysRevE.54.2084 [C]) is $x(t+h)=x_0+(x-x_0)e^{-h/\tau}+\sigma\sqrt{1-e^{-2h/\tau}}\,\mathcal N(0,1)$.
- For a LIF driven by an OU current, the joint Gaussian update of $(I,V)$ is also exact, using Gillespie's formula for the integral. This fits your design naturally.

**Channel noise.** Fox & Lu, *Phys. Rev. E* 49:3421 (1994), DOI 10.1103/PhysRevE.49.3421 [C]; Goldwyn & Shea-Brown, *PLoS Comput. Biol.* 7:e1002247 (2011), DOI 10.1371/journal.pcbi.1002247 [C].

**Exact integration.** For reference: Rotter & Diesmann, *Biol. Cybern.* 81:381 (1999), DOI 10.1007/s004220050570 [C].

### 2.6 Mean-Field and Next-Generation Neural Mass Models

**Montbrió–Pazó–Roxin (MPR).** *Phys. Rev. X* 5:021028 (2015), DOI 10.1103/PhysRevX.5.021028 [C]. Equations [K].
- $\tau\dot r=\Delta/(\pi\tau)+2rv$
- $\tau\dot v=v^2+\bar\eta+J\tau r+I(t)-(\pi\tau r)^2$
- It is an exact reduction of an all-to-all QIF network with Lorentzian-distributed excitabilities $\eta$.

**Extensions.**
- Synaptic dynamics:
  - Ratas & Pyragas, *PRE* 94:032215 (2016), DOI 10.1103/PhysRevE.94.032215 [C].
  - Devalle, Roxin, Montbrió, *PLoS Comput. Biol.* 13:e1005881 (2017), DOI 10.1371/journal.pcbi.1005881 [C].
- Gap junctions: Pietras et al., *PRE* 100:042412 (2019), DOI 10.1103/PhysRevE.100.042412 [C].
- Conductance synapses and neural fields: Byrne et al., *J. Neurophysiol.* 123:726 (2020), DOI 10.1152/jn.00406.2019 [C].
- Short-term plasticity (STP): Taher, Torcini, Olmi, *PLoS Comput. Biol.* 16:e1008533 (2020), DOI 10.1371/journal.pcbi.1008533 [C].
- Adaptation and depression: Gast, Schmidt, Knösche, *Neural Comput.* 32:1615 (2020), DOI 10.1162/neco_a_01300 [C].
  - The adaptation variable $A$ is driven by $r$ through an alpha kernel (a second-order linear ODE).
  - It enters multiplicatively on the synaptic efficacy (depression) or additively (spike-frequency adaptation).
  - $\tau_A=10\tau$ and $\Delta=2$, from the text.
- Spike-frequency adaptation in QIF masses: Ferrara et al., *PRE* 107:024311 (2023), DOI 10.1103/PhysRevE.107.024311 [C].
- Izhikevich neurons with adaptation: Chen & Campbell, *J. Comput. Neurosci.* 50:445 (2022), DOI 10.1007/s10827-022-00825-9 [C].

**Gast, Solla, Kennedy.** *PRE* 107:024306 (2023), DOI 10.1103/PhysRevE.107.024306 [C]; arXiv:2209.03501 [A]. Equations [S].
- The model: Izhikevich neurons with Lorentzian-distributed thresholds $v_\theta$ (centre $\bar v_\theta$, width $\Delta_v$). The mean-field equations are:
  - $C\dot r=\tfrac{\Delta_vk^2}{\pi C}(v-v_r)+r\,(k(2v-v_r-\bar v_\theta)-gs)$
  - $C\dot v=kv(v-v_r-\bar v_\theta)-\pi Cr(\Delta_v+\tfrac{\pi C}{k}r)+kv_r\bar v_\theta-u+I+gs(E-v)$
  - $\tau_u\dot u=b(v-v_r)-u+\tau_u\kappa r$
  - $\tau_s\dot s=-s+\tau_sJr$
- The reduction is approximate: it assumes mean-field adaptation.
- Follow-up: *PNAS* 121:e2311885121 (2024), DOI 10.1073/pnas.2311885121 [C].

**Finite-size (mesoscopic) populations.**
- Schwalger, Deger, Gerstner, *PLoS Comput. Biol.* 13:e1005507 (2017), DOI 10.1371/journal.pcbi.1005507 [C].
- Schmutz, Gerstner, Schwalger, *J. Math. Neurosci.* 10:5 (2020), DOI 10.1186/s13408-020-00082-z [C], which adds STP.

**AdEx and conductance mean fields.**
- Augustin et al., *PLoS Comput. Biol.* 13:e1005545 (2017), DOI 10.1371/journal.pcbi.1005545 [C].
- di Volo et al., *Neural Comput.* 31:653 (2019), DOI 10.1162/neco_a_01173 [C].

**Integration.** These are polynomial ODEs; use RK4 or RK45. A natural validation test: compare MPR against your exactly integrated QIF network with Lorentzian $\eta$.

---

## 3. Plasticity and Learning Rules

### 3.1 Voltage-Based STDP

**Clopath, Büsing, Vasilaki, Gerstner.** *Nat. Neurosci.* 13:344 (2010), DOI 10.1038/nn.2479 [C]. Equations [K].
- Depression: $\dot w^-=-A_{LTD}(\bar{\bar u})\,X_i(t)\,[\bar u_-(t)-\theta_-]_+$.
- Potentiation: $\dot w^+=A_{LTP}\,\bar x_i(t)\,[u(t)-\theta_+]_+\,[\bar u_+(t)-\theta_-]_+$.
- $\bar u_\pm$ are low-pass-filtered voltages; $\bar x$ is a presynaptic trace.
- Homeostasis: $A_{LTD}(\bar{\bar u})=A_{LTD}\bar{\bar u}^2/u_{ref}^2$.
- Visual-cortex parameter set (as in NEST) [K?]:
  - $A_{LTD}=14\times10^{-5}$ mV⁻¹, $A_{LTP}=8\times10^{-5}$ mV⁻²;
  - $\theta_-=-70.6$ mV, $\theta_+=-45.3$ mV;
  - $\tau_-=10$ ms, $\tau_+=7$ ms, $\tau_x=15$ ms;
  - $u_{ref}^2=60$ mV².
- The neuron is AdEx with a depolarising after-potential and an adaptive threshold.
- **Integration.** The traces are linear filters (exact). The rectified voltage products need quadrature within a step, or grid sampling.
- **Related.**
  - Bono & Clopath, *Nat. Commun.* 8:706 (2017), DOI 10.1038/s41467-017-00740-z [C], for dendritic spikes.
  - Litwin-Kumar & Doiron, *Nat. Commun.* 5:5319 (2014), DOI 10.1038/ncomms6319 [C], forming assemblies with Clopath STDP plus inhibitory STDP.

### 3.2 Calcium-Based Rules

**Graupner & Brunel.** *PNAS* 109:3991 (2012), DOI 10.1073/pnas.1109359109 [C].
- **Equations [K].**
  - Efficacy: $\tau\dot\rho=-\rho(1-\rho)(\rho_\star-\rho)+\gamma_p(1-\rho)\Theta[c-\theta_p]-\gamma_d\rho\,\Theta[c-\theta_d]+\text{noise}$. The noise is active only while calcium is above threshold.
  - Calcium: $\dot c=-c/\tau_{Ca}+C_{pre}\sum\delta(t-t_i-D)+C_{post}\sum\delta(t-t_j)$.
  - Weight: $w=w_0+\rho(w_1-w_0)$.
- **Values stated in the main text [S].** $\theta_p=1.3$, $\theta_d=1$, $C_{pre}=1$, $C_{post}=2$, $D=13.7$ ms, $\rho_\star=0.5$. The fitted parameter sets are in SI Tables S1–S2, which I did not transcribe.
- **Integration.** $c$ is linear, so the time it spends above each threshold within a step can be computed exactly. $\rho$ is cubic and needs an integrator. An event-driven solution exists: Higgins, Graupner, Brunel, *PLoS Comput. Biol.* 10:e1003834 (2014), DOI 10.1371/journal.pcbi.1003834 [C].

**Related.**
- Shouval, Bear, Cooper, *PNAS* 99:10831 (2002), DOI 10.1073/pnas.152343099 [C].
- Graupner, Wallisch, Ostojic, *J. Neurosci.* 36:11238 (2016), DOI 10.1523/JNEUROSCI.0104-16.2016 [C].
- Inglebert et al., *PNAS* 117:33639 (2020), DOI 10.1073/pnas.2013663117 [C]: STDP depends on the physiological extracellular calcium concentration.
- Chindemi et al., *Nat. Commun.* 13:3038 (2022), DOI 10.1038/s41467-022-30214-w [C]: a calcium model specific to synapse location, used in the Blue Brain cortex model.

### 3.3 Spike-Driven Bistable and Unsupervised Neuromorphic Rules

**Brader, Senn, Fusi.** *Neural Comput.* 19:2881 (2007), DOI 10.1162/neco.2007.19.11.2881 [C]. Equations [K].
- At each presynaptic spike, the internal variable $X$ is pushed up or down. The direction depends on the postsynaptic voltage relative to $\theta_V$, gated by calcium windows.
- Between spikes, $X$ drifts towards one of two stable states.
- Mixed-signal chips use this rule.

**Diehl & Cook.** *Front. Comput. Neurosci.* 9:99 (2015), DOI 10.3389/fncom.2015.00099 [C]. Equations [K].
- STDP based on a presynaptic trace.
- Homeostasis through an adaptive threshold: $\theta\mathrel{+}=\theta_+$ at each spike, with very slow decay [K?: $\tau_\theta=10^7$ ms].

### 3.4 Three-Factor Rules with Eligibility Traces

**Izhikevich.** *Cereb. Cortex* 17:2443 (2007), DOI 10.1093/cercor/bhl152 [C]. Equations [K].
- Eligibility: $\dot c=-c/\tau_c+\mathrm{STDP}(\Delta t)\,\delta(\cdot)$.
- Weight: $\dot s=c\,d$.
- Dopamine: $\dot d=-d/\tau_d+\mathrm{DA}(t)$.
- $\tau_c=1$ s and $\tau_d=0.2$ s.

**Frémaux & Gerstner.** *Front. Neural Circuits* 9:85 (2016), DOI 10.3389/fncir.2015.00085 [C].
- The general template: $\dot w=\eta M(t)e(t)$ and $\tau_e\dot e=-e+H(\text{pre},\text{post})$.

**Related.**
- Florian, *Neural Comput.* 19:1468 (2007), DOI 10.1162/neco.2007.19.6.1468 [C].
- Legenstein, Pecevski, Maass, *PLoS Comput. Biol.* 4:e1000180 (2008), DOI 10.1371/journal.pcbi.1000180 [C].
- Frémaux, Sprekeler, Gerstner, *PLoS Comput. Biol.* 9:e1003024 (2013), DOI 10.1371/journal.pcbi.1003024 [C]: actor–critic and TD learning.
- Gerstner et al., *Front. Neural Circuits* 12:53 (2018), DOI 10.3389/fncir.2018.00053 [C]: experimental support.

**Integration.** All traces are linear, so exact.

### 3.5 Dendritic, Burst and Behavioural-Timescale Rules

**Urbanczik–Senn rule.** Equations [K].
- $\dot w_i=\eta\,(S(t)-\varphi(V^*_w))\,h(V^*_w)\,\mathrm{PSP}_i$, with $h=\varphi'/\varphi$, low-pass filtered.

**Payeur, Guerguiev, Zenke, Richards, Naud.** *Nat. Neurosci.* 24:1010 (2021), DOI 10.1038/s41593-021-00857-x [C].
- Rule [K]: $\dot w_{ij}=\eta\,[B_i(t)-\bar P_i(t)E_i(t)]\,\tilde E_j(t)$.
  - $B$ is the burst train and $E$ the event train.
  - $\bar P$ is a moving average of the burst probability: $\tau_{avg}=15$ s for the pairing protocols, 2 s for the XOR task [S].
  - $\tilde E_j$ is a presynaptic trace, $\tau_{pre}\sim10$ ms [S].
- It solves credit assignment in hierarchies ("burstprop").

**Behavioural-timescale plasticity (BTSP).**
- Experiments: Bittner et al., *Science* 357:1033 (2017), DOI 10.1126/science.aan3846 [C]; Milstein et al., *eLife* 10:e73046 (2021), DOI 10.7554/eLife.73046 [C].
- Model: Wu & Maass, *Nat. Commun.* 16:342 (2025), DOI 10.1038/s41467-024-55563-6 [C]. Rule [S]:
  - Each neuron receives a plateau potential independently, with probability $f_q$; the experimental value is 0.005.
  - If an input arrives within the 10 s window opened by the plateau (from −6 to +4 s), then with probability 0.5: $\Delta w_i=+1$ if $x_i=1$ and $w_i=0$; $\Delta w_i=-1$ if $x_i=1$ and $w_i=1$.
  - Weights are binary, and the rule does not depend on postsynaptic firing.

### 3.6 Inhibitory and Homeostatic Plasticity

**Inhibitory STDP.** Vogels, Sprekeler, Zenke, Clopath, Gerstner, *Science* 334:1569 (2011), DOI 10.1126/science.1211095 [C]. Equations [K].
- At a presynaptic spike: $w\mathrel{+}=\eta(x_{post}-\alpha)$.
- At a postsynaptic spike: $w\mathrel{+}=\eta x_{pre}$.
- Traces: $\tau_{STDP}=20$ ms; $\alpha=2\rho_0\tau_{STDP}$, where $\rho_0$ is the target rate (a few Hz).

**Co-dependent excitatory and inhibitory plasticity.** Agnes & Vogels, *Nat. Neurosci.* 27:964 (2024), DOI 10.1038/s41593-024-01597-4 [C]. Review: Hennequin, Agnes, Vogels, *Annu. Rev. Neurosci.* 40:557 (2017), DOI 10.1146/annurev-neuro-072116-031005 [C].

**Homeostasis.**
- Zenke, Hennequin, Gerstner, *PLoS Comput. Biol.* 9:e1003330 (2013), DOI 10.1371/journal.pcbi.1003330 [C]: a fast rate detector is necessary.
- Zenke, Agnes, Gerstner, *Nat. Commun.* 6:6922 (2015), DOI 10.1038/ncomms7922 [C]: triplet STDP plus heterosynaptic and transmitter-induced terms plus consolidation [K, qualitative].
- Synaptic scaling: Turrigiano et al., *Nature* 391:892 (1998), DOI 10.1038/36103 [C].
- Intrinsic plasticity: Triesch, *Neural Comput.* 19:885 (2007), DOI 10.1162/neco.2007.19.4.885 [C].
- BCM: Bienenstock, Cooper, Munro, *J. Neurosci.* 2:32 (1982), DOI 10.1523/JNEUROSCI.02-01-00032.1982 [C]; rule $\dot w=xy(y-\theta_M)$ with $\theta_M=\langle y^2\rangle$ [K].

### 3.7 Structural Plasticity

**Butz & van Ooyen.** *PLoS Comput. Biol.* 9:e1003259 (2013), DOI 10.1371/journal.pcbi.1003259 [C]; NEST implementation: Diaz-Pier et al., *Front. Neuroanat.* 10:57 (2016), DOI 10.3389/fnana.2016.00057 [C]. Equations [K?].
- Synaptic elements grow according to calcium: $\dot z=\nu\,(2e^{-((Ca-\xi)/\zeta)^2}-1)$, a Gaussian growth curve.
- Calcium is a linear trace of spikes.

**Synaptic sampling.** Kappel et al., *PLoS Comput. Biol.* 11:e1004485 (2015), DOI 10.1371/journal.pcbi.1004485 [C]. Equations [K].
- Langevin dynamics on a synaptic parameter $\theta$: drift $b(\partial_\theta\log p_S+\partial_\theta\log p_N)$ plus noise $\sqrt{2Tb}\,dW$.
- The weight is $w=e^{\theta-\theta_0}$ when $\theta>0$, and 0 otherwise.

**Deep Rewiring.** Bellec et al., ICLR 2018, arXiv:1711.05136 [A].

### 3.8 Gradient-Based Learning

**Surrogate gradients.**
- Neftci, Mostafa, Zenke, *IEEE Signal Process. Mag.* 36:51 (2019), DOI 10.1109/MSP.2019.2931595 [C].
- SuperSpike: Zenke & Ganguli, *Neural Comput.* 30:1514 (2018), DOI 10.1162/neco_a_01086 [C].
- Zenke & Vogels, *Neural Comput.* 33:899 (2021), DOI 10.1162/neco_a_01367 [C]: robust to the surrogate's shape; its scale matters.
- STBP: Wu et al., *Front. Neurosci.* 12:331 (2018), DOI 10.3389/fnins.2018.00331 [C].
- SLAYER: Shrestha & Orchard, NeurIPS 2018, arXiv:1810.08646 [A].
- All need backpropagation through time and autodiff, so they belong outside a forward C++ simulator, or to a later adjoint layer.

**Exact gradients.**
- EventProp: Wunderlich & Pehle, *Sci. Rep.* 11:12829 (2021), DOI 10.1038/s41598-021-91786-z [C].
  - Adjoint ODEs, linear between spikes, are integrated backward for LIF with current synapses.
  - The adjoints jump at the forward spike times.
  - The gradient is $dL/dw_{ji}=-\tau_{syn}\sum_{k}\lambda_{I}(t_k)$, summed over presynaptic spike times [K].
  - It is the natural partner of exact forward integration.
- Göltz et al., *Nat. Mach. Intell.* 3:823 (2021), DOI 10.1038/s42256-021-00388-x [C]: first-spike times.
- DelGrad: Göltz et al., *Nat. Commun.* 16:8245 (2025), DOI 10.1038/s41467-025-63120-y [C]: delays and weights on BrainScaleS-2.
- Mészáros, Knight, Nowotny, *Nat. Commun.* 16:10422 (2025), DOI 10.1038/s41467-025-65394-8 [C]: delays with EventProp.
- Nowotny, Turner, Knight, *Neuromorph. Comput. Eng.* 5:014001 (2025), DOI 10.1088/2634-4386/ada852 [C].

**Online approximations.**
- **e-prop.** Bellec et al., *Nat. Commun.* 11:3625 (2020), DOI 10.1038/s41467-020-17236-y [C]. Equations [K].
  - LIF eligibility: $e^t_{ji}=\psi^t_j\bar z^{t-1}_i$.
  - ALIF eligibility vector: $\epsilon^{t+1}_{ji,a}=\psi^t_j\bar z^{t-1}_i+(\rho-\psi^t_j\beta)\epsilon^t_{ji,a}$, giving $e^t_{ji}=\psi^t_j(\bar z^{t-1}_i-\beta\epsilon^t_{ji,a})$.
  - Pseudo-derivative: $\psi=\tfrac{\gamma_{pd}}{v_{th}}\max(0,1-|(v-A)/v_{th}|)$, with $\gamma_{pd}=0.3$.
  - Learning signal: $L^t_j=\sum_kB_{jk}(y^t_k-y^{*t}_k)$, with $B$ random or $B=W_{out}^\top$.
  - Update: $\Delta W_{ji}=-\eta\sum_tL^t_jF_\kappa(e^t_{ji})$.
  - The eligibility vectors are exactly the sensitivities of the linear propagator, so they can be computed exactly in your framework.
- DECOLLE: Kaiser, Mostafa, Neftci, *Front. Neurosci.* 14:424 (2020), DOI 10.3389/fnins.2020.00424 [C].
- OSTL: Bohnstingl et al., *IEEE TNNLS* 34:8894 (2023), DOI 10.1109/TNNLS.2022.3153985 [C].
- OTTT: Xiao et al., NeurIPS 2022, arXiv:2210.04195 [A].
- FPTT: Yin, Corradi, Bohté, *Nat. Mach. Intell.* 5:518 (2023), DOI 10.1038/s42256-023-00650-4 [C].
- RFLO: Murray, *eLife* 8:e43299 (2019), DOI 10.7554/eLife.43299 [C].
- Review: Zenke & Neftci, *Proc. IEEE* 109:935 (2021), DOI 10.1109/JPROC.2020.3045625 [C].

**Learnable delays.**
- Hammouamri, Khalfaoui-Hassani, Masquelier, ICLR 2024, arXiv:2306.17670 [A]: dilated convolutions with learnable spacings.
- Delays map naturally onto integer grid shifts.

### 3.9 Meta-Learned Rules

- Confavreux et al., bioRxiv DOI 10.1101/2020.10.24.353409 [C]. The NeurIPS 2020 venue is not checked.
- Confavreux et al., *NeurIPS 36* (2023), DOI 10.52202/075280-0597 [C].

### 3.10 On-Chip Learning

- Loihi's learning engine (Davies et al. 2018) [K]: rules are sums of products of pre- and postsynaptic traces and a reward trace.
- Your trace infrastructure can express this class directly.

---

## 4. Quantum Spiking and Quantum Neuromorphic Models

### 4.0 Classical Simulation Toolbox

**The GKSL (Lindblad) master equation.**
- $\dot\rho=\mathcal L\rho=-i[H,\rho]+\sum_k\gamma_k\,(L_k\rho L_k^\dagger-\tfrac12\{L_k^\dagger L_k,\rho\})$.
- Sources: Lindblad, *Commun. Math. Phys.* 48:119 (1976), DOI 10.1007/BF01608499 [C]; Gorini, Kossakowski, Sudarshan, *J. Math. Phys.* 17:821 (1976), DOI 10.1063/1.522979 [C].

**Vectorised form.** With column stacking:
- $\hat{\mathcal L}=-i(I\otimes H-H^{\top}\otimes I)+\sum_k\gamma_k\big(\bar L_k\otimes L_k-\tfrac12I\otimes L_k^\dagger L_k-\tfrac12(L_k^\dagger L_k)^{\top}\otimes I\big)$.
- Its dimension is $4^N$ for $N$ qubits.
- With piecewise-constant input $s$, the step is $\rho_{k+1}=e^{\hat{\mathcal L}(s_k)h}\rho_k$, exactly your propagator pattern.
- Dense matrix exponentials are cheap up to $N\approx5$–6 (6 qubits gives 4096×4096). Beyond that, use Krylov methods ("expmv").

**Affine coordinates.** Write $\rho=I/d+\sum_kr_kG_k$. Then $\dot r=Mr+c$ is affine in $d^2-1$ real dimensions.
- For one qubit, take $H=\tfrac\Delta2\sigma_z+\tfrac\Omega2\sigma_x$, amplitude damping $L=\sigma^-$ at rate $\gamma=1/T_1$, and pure dephasing such that $1/T_2=\gamma/2+\gamma_\phi$. Then:
  - $M=\begin{pmatrix}-1/T_2&-\Delta&0\\ \Delta&-1/T_2&-\Omega\\0&\Omega&-1/T_1\end{pmatrix}$ and $c=(0,0,-1/T_1)$;
  - $z=+1$ is the excited state.
- This is exact through a 4×4 augmented matrix exponential, the same as your affine flows.

**Quantum-jump (Monte Carlo wave-function) unravelling.** Sources: Dalibard, Castin, Mølmer, *PRL* 68:580 (1992), DOI 10.1103/PhysRevLett.68.580 [C]; Plenio & Knight, *Rev. Mod. Phys.* 70:101 (1998), DOI 10.1103/RevModPhys.70.101 [C].
- Effective Hamiltonian: $H_{\rm eff}=H-\tfrac i2\sum_k\gamma_kL_k^\dagger L_k$.
- Survival probability: $S(t)=\|e^{-iH_{\rm eff}t}\psi\|^2$.
- The jump hazard is $\sum_k\gamma_k\langle L_k^\dagger L_k\rangle$. The channel is chosen with probability proportional to $\gamma_k\|L_k\psi\|^2$, and the state after the jump is $L_k\psi/\|L_k\psi\|$.
- On a grid, the jump probability per step is $1-S(t+h)/S(t)$, evaluated exactly. This is your escape-noise machinery: spike equals jump, and the jump is a reset map.
- Cost: a state vector of size $2^N$, so up to about $N\approx20$ per trajectory.

**Mean-field closure.** Assume a product state $\rho=\bigotimes_i\rho_i$. This gives nonlinear coupled Bloch equations.

**Classical limit.** If $H$ commutes with all the $\sigma^z_i$ and the jump operators flip spins, the diagonal subspace is closed. The dynamics then reduce to a classical (Glauber-type) master equation.

### 4.1 Ising-Type Models

**Classical baselines.** Hopfield, *PNAS* 79:2554 (1982), DOI 10.1073/pnas.79.8.2554 [C]; Ackley, Hinton, Sejnowski, *Cogn. Sci.* 9:147 (1985), DOI 10.1207/s15516709cog0901_7 [C].

**Transverse-field Hopfield network.** Nishimori & Nonomura, *J. Phys. Soc. Jpn.* 65:3780 (1996), DOI 10.1143/JPSJ.65.3780 [C]. Equations [K].
- $H=-\tfrac12\sum_{i\ne j}J_{ij}\sigma^z_i\sigma^z_j-\Gamma\sum_i\sigma^x_i$, with Hebbian $J_{ij}=\tfrac1N\sum_\mu\xi^\mu_i\xi^\mu_j$.
- $\Gamma$ acts on retrieval qualitatively like temperature.
- State space $2^N$; simulate by exact diagonalisation or a Gibbs state for $N\lesssim14$.

**Quantum Boltzmann machine.** Amin, Andriyash, Rolfe, Kulchytskyy, Melko, *PRX* 8:021050 (2018), DOI 10.1103/PhysRevX.8.021050 [C]. Equations [K].
- $H=-\sum_a\Gamma_a\sigma^x_a-\sum_ab_a\sigma^z_a-\sum_{a<b}w_{ab}\sigma^z_a\sigma^z_b$.
- $\rho=e^{-H}/Z$ and $P_v=\mathrm{Tr}[\Lambda_v\rho]$.
- Training uses a Golden–Thompson bound; the transverse fields $\Gamma$ are not learnable under that bound.
- It is an equilibrium model with no spikes; simulate by exact diagonalisation.

**Quantum annealers as Boltzmann samplers.** Benedetti et al., *PRA* 94:022308 (2016), DOI 10.1103/PhysRevA.94.022308 [C]; Dixit et al., *Front. Phys.* 9:589626 (2021), DOI 10.3389/fphy.2021.589626 [C].

**Coherent Ising machines (CIM).**
- Wang, Marandi, Wen, Byer, Yamamoto, *PRA* 88:063853 (2013), DOI 10.1103/PhysRevA.88.063853 [C].
- McMahon et al., *Science* 354:614 (2016), DOI 10.1126/science.aah5178 [C].
- Inagaki et al., *Science* 354:603 (2016), DOI 10.1126/science.aah4243 [C]. Its title is "…for 2000-node optimization problems"; the 100,000-spin machine is Honjo et al., *Sci. Adv.* 7:eabh0952 (2021), DOI 10.1126/sciadv.abh0952 [C].
- Review: Mohseni, McMahon, Byrnes, *Nat. Rev. Phys.* 4:363 (2022), DOI 10.1038/s42254-022-00440-8 [C].
- Commonly used normalised mean-field form [K?]: $\dot x_i=(p-1-x_i^2)x_i+\varepsilon\sum_jJ_{ij}x_j$ (+ noise), with $\sigma_i=\mathrm{sign}\,x_i$.
- Amplitude-heterogeneity correction: Leleu et al., *PRL* 122:040607 (2019), DOI 10.1103/PhysRevLett.122.040607 [C]. It adds error variables $e_i$ with $\dot e_i=-\xi(x_i^2-a)e_i$ [K?].

**Spiking CIM (SNN-CIM).** Lu, Gao, Wen, Wang, *Quantum* 7:1151 (2023), DOI 10.22331/q-2023-10-24-1151 [C]. Equations [S].
- $\dot x_i=\alpha x_i-x_i^3+J_{xk}\beta k_i+I_{ext}$
- $\dot k_i=-\beta k_i+J_{kx}x_i$
- $I_{ext}=\tanh(\varepsilon\sum_jJ_{ij}x_j)$
- This is FitzHugh–Nagumo-like: the "dissipative pulse" $k$ is a slow negative feedback.
- Follow-up: Jiang et al., arXiv:2509.13917 [A].
- Purely classical ODEs; your FHN infrastructure suffices.

**Analogue Ising machines for sampling and machine learning.** Böhm et al., *Nat. Commun.* 13:5847 (2022), DOI 10.1038/s41467-022-33441-3 [C].

**Associative memory in cavity QED.**
- Fiorelli et al., *PRL* 125:070604 (2020), DOI 10.1103/PhysRevLett.125.070604 [C]: a multimode Dicke model.
- Marsh et al., *PRX* 11:021048 (2021), DOI 10.1103/PhysRevX.11.021048 [C]: confocal cavity QED.

**"Quantum Hopfield neural network."** Rebentrost et al., *PRA* 98:042308 (2018), DOI 10.1103/PhysRevA.98.042308 [C]. Despite the name, it stores patterns in a density matrix and retrieves them by matrix inversion. It is not a dynamical neuron model.

**Artificial spiking quantum neuron (Kristensen et al.).** *npj Quantum Inf.* 7:59 (2021), DOI 10.1038/s41534-021-00381-7 [C]; arXiv:1907.06269 [A]. Equations [S].
- *Correction to the brief:* this is a **closed-system** spin model, not a Lindblad model. The paper states: "all simulations were performed without the simulation of noise and decoherence".
- **Excitation-counting neuron** (inputs are qubits 1–2, the output is qubit 3):
  - $H_{\rm Exc}=\tfrac J2(\sigma^x_1\sigma^x_2+\sigma^y_1\sigma^y_2+\sigma^z_1\sigma^z_2)+\beta\sigma^z_2\sigma^z_3+A\cos(2\beta t/\hbar)\sigma^x_3$.
  - Conditions: $|2\beta\pm2\sqrt{J^2+\beta^2}|\gg A$, $\beta=kA$, $J=\pm\sqrt{l^2-k^2}A$ with integers $k,l$.
  - Effect: $|\Phi^\pm\rangle|\!\downarrow\rangle\to|\Phi^\pm\rangle|\!\uparrow\rangle$, while $\Psi^\pm$ leaves the output unchanged.
- **Phase neuron:**
  - $H_{\rm phase}=\tfrac J2(\cdot)+\delta\sigma^x_2\sigma^x_3+B\sigma^z_3$, run for $\tau=\pi\hbar/2B$, and conjugated with Hadamard gates.
- The "spike" is the output spin flip. The inputs are preserved, and measuring the output acts back on the entangled inputs.
- State space $2^3$; simulate by 8×8 matrix exponentials (Floquet for the driven term).

### 4.2 Open-System (GKSL) Models

**(a) Open quantum generalisation of Hopfield networks.** Rotondo, Marcuzzi, Garrahan, Lesanovsky, Müller, *J. Phys. A* 51:115301 (2018), DOI 10.1088/1751-8121/aaabcb [C]; arXiv:1701.01727 [A]. Equations [S].
- **Jump operators.** $L_{i\pm}=\Gamma_{i\pm}\sigma^\pm_i$, with $\Gamma_{i\pm}=e^{\mp\beta\Delta E_i/2}/(2\cosh\beta\Delta E_i)^{1/2}$ and $\Delta E_i=\sum_{j\ne i}J_{ij}\sigma^z_j$.
  - The rates are operator-valued, so the coupling enters through them.
  - $\Gamma_+^2+\Gamma_-^2=1$, and the rates satisfy detailed balance.
- **Hamiltonian.** $H=\Omega\sum_i\sigma^x_i$.
- **Classical limit.** For $\Omega=0$ the dynamics are exactly the classical Glauber master equation of the Hopfield network.
- **Single-spin equation.** $\dot\sigma^z_i=2\Omega\sigma^y_i-\gamma\sigma^z_i+\gamma\tanh(\beta\Delta E_i)$.
- **Mean field on the overlaps** $\mathbf m^\alpha=\tfrac1N\sum_i\xi_i\sigma^\alpha_i$, with time in units of $1/\gamma$:
  - $\dot{\mathbf m}^z=2\Omega\mathbf m^y+\tfrac1N\sum_i\xi_i\tanh(\beta\xi_i\cdot\mathbf m^z)-\mathbf m^z$
  - $\dot{\mathbf m}^y=-2\Omega\mathbf m^z-\tfrac12\mathbf m^y$
  - Fixed points satisfy $(1+8\Omega^2)\mathbf m^z=\overline{\xi\tanh(\beta\xi\cdot\mathbf m^z)}$.
  - A new non-equilibrium phase appears: limit cycles.
- **Spike.** An up-jump of neuron $i$ ($\sigma^+$), which in the trajectory picture is a jump event.
- **Simulation.** Exact Liouvillian for $N\le5$–6; quantum-jump trajectories for $N\lesssim20$; mean field (nonlinear ODE) for large $N$.

**(b) Quantum leaky integrate-and-fire neuron (QLIF).** Brand & Petruccione, *npj Quantum Inf.* 10:125 (2024), DOI 10.1038/s41534-024-00921-x [C]; arXiv:2407.16398 [A]. Equations [S].
- **State.** A single qubit; the "membrane" is the excited-state population $\alpha$.
- **Memory.** The previous state is re-prepared by $R_X(\varphi)$ with $\varphi=2\arcsin\sqrt{\alpha}$.
- **Input.** An input spike is $R_X(\theta)$, with $\theta$ the trainable weight, giving $\alpha'=\sin^2((\theta+\varphi)/2)$.
- **Leak.** With no input, a delay gate lets $T_1$ relaxation act. The paper models it by a counter-rotation $\gamma=-2\arcsin\sqrt{\alpha e^{-\tau/T_1}}$, and writes $\alpha[t{+}1]=\sin^2\!\tfrac{(\theta+\varphi)X}{2}+\sin^2\!\tfrac{(\gamma+\varphi)(X-1)}{2}$.
- **Spike.** Measure; if $\alpha$ exceeds the threshold, emit a spike and reset to $|0\rangle$.
- **Caveat (my reading of the arXiv source).** For $X=0$ the printed map gives $\sin^2(\arcsin\sqrt\alpha-\arcsin\sqrt{\alpha e^{-\tau/T_1}})$, which is **not** the $T_1$ law $\alpha e^{-\tau/T_1}$. Physical amplitude damping gives $\alpha\leftarrow\alpha e^{-\tau/T_1}$. Implement the physical channel, and offer the printed map only to reproduce the paper.
- **Simulation.** Trivially classical: a scalar map, or the Bloch affine flow of §4.0.

**(c) Quantized memristive LIF circuit.** Brand, Dibenedetto, Petruccione, *Phys. Rev. Research* 8:013131 (2026), DOI 10.1103/y61v-2bxf [C]; arXiv:2506.21363 [A]. Equations [S].
- **Hamiltonian.** $H=\hbar\omega_0(a^\dagger a+\tfrac12)-\hat\phi_0I_0\sin\omega t$, with $\hat\phi_0=\sqrt{\hbar Z_0/2}(a+a^\dagger)$.
- **Master equation.** $\dot\rho=-\tfrac i\hbar[H,\rho]+\gamma(t)\mathcal D[a]\rho$.
- **Memristive damping.** $\gamma=1/(C_mM(q))$, with $q(t)=\int\langle\hat\phi_0\rangle/Z_0\,d\tau$ and $M(q)=R_{on}q/q_{max}+R_{off}(1-q/q_{max})$.
- **Spike.** The threshold is monitored classically on $\langle V\rangle$; on reaching it, the state is reset to $|0\rangle\langle0|$ and input and memristor are paused for a refractory time.
- *Remark (my derivation).* $H$ is linear in $a$ and the dissipator is $\mathcal D[a]$, so coherent states stay coherent. $\langle a\rangle$ therefore obeys a classical damped, driven oscillator equation with the state-dependent damping $\gamma(q)$. The quantum content is a constant zero-point variance. A classical simulator integrates the mean exactly, piecewise in $q$.

**(d) Quantum memristors and quantized Hodgkin–Huxley neurons.**
- Pfeiffer et al., *Sci. Rep.* 6:29507 (2016), DOI 10.1038/srep29507 [C].
- Gonzalez-Raya et al., *Phys. Rev. Applied* 12:014037 (2019), DOI 10.1103/PhysRevApplied.12.014037 [C]; arXiv:1807.10698 [A].
- Gonzalez-Raya, Solano, Sanz, *Quantum* 4:224 (2020), DOI 10.22331/q-2020-01-20-224 [C].
- Experiment: Spagnolo et al., *Nat. Photonics* 16:318 (2022), DOI 10.1038/s41566-022-00973-5 [C].
- These are dissipative circuits with state-dependent damping or weak measurement. I did not transcribe their equations.

**(e) Stochastic quantum SNN with quantum memory.** Chen, Rajendran, Simeone, *IEEE JSAC* 44:5421 (2026), DOI 10.1109/JSAC.2026.3714333 [C]; arXiv:2506.21324 [A]. Equations [S].
- **Input.** Currents $z_t=\sum_pw_px^p_t$ set $R_X$ angles on the spike qubits.
- **Coupling.** A parametrised unitary $V(\theta)$ couples the spike qubits to memory qubits: $U=V(\theta)(\bigotimes R_X(\phi^n_t)\otimes I)$.
- **Spike.** The spike qubits are measured projectively, so spikes are sampled with probability $p(s_t)=\langle s_t|\rho^I_t|s_t\rangle$.
- **Memory update.** The memory is conditioned on the outcome, $\sigma^{\rm mem}_t\propto(\langle s_t|\otimes I)\rho^{IM}_t(|s_t\rangle\otimes I)$, and the spike qubits are reset to $|0\rangle$.
- **Single-neuron model.** Membrane $\alpha_t=\sin^2(\varphi_t/2)$; the angle is re-prepared unless the neuron spiked; leak via $f_o$ with $T_1$.
- **Learning.** A local, likelihood-based rule. Spikes are measurement-driven and stochastic.
- **Simulation.** Density matrices of $2^{N+M}$, which is small per neuron; exact.

**(f) Quantum walks.**
- Quantum stochastic walks: Whitfield, Rodríguez-Rosario, Aspuru-Guzik, *PRA* 81:022323 (2010), DOI 10.1103/PhysRevA.81.022323 [C]. A GKSL interpolation between quantum and classical walks.
- Schuld, Sinayskiy, Petruccione, *PRA* 89:032333 (2014), DOI 10.1103/PhysRevA.89.032333 [C]: walks over the network's firing patterns.

**(g) Dissipative perceptrons and quantum neurons.**
- Beer et al., *Nat. Commun.* 11:808 (2020), DOI 10.1038/s41467-020-14454-2 [C]: layer maps $\rho_{out}=\mathrm{Tr}_{in}[U(\rho_{in}\otimes|0\rangle\langle0|)U^\dagger]$.
- Sharma et al., *PRL* 128:180505 (2022), DOI 10.1103/PhysRevLett.128.180505 [C].
- Cao, Guerreschi, Aspuru-Guzik, arXiv:1711.11240 [A].
- Tacchino et al., *npj Quantum Inf.* 5:26 (2019), DOI 10.1038/s41534-019-0140-4 [C].
- Torrontegui & García-Ripoll, *EPL* 125:30004 (2019), DOI 10.1209/0295-5075/125/30004 [C]: an adiabatic Ising perceptron.

**(h) Quantum reservoir computing (QRC).**
- **Fujii & Nakajima.** *Phys. Rev. Applied* 8:024030 (2017), DOI 10.1103/PhysRevApplied.8.024030 [C]. Equations [K].
  - Reservoir: $H=\sum_{ij}J_{ij}X_iX_j+h\sum_iZ_i$.
  - Input: qubit 1 is replaced by $\sqrt{1-s_k}|0\rangle+\sqrt{s_k}|1\rangle$.
  - Readout: $\langle Z_i\rangle$ at virtual nodes.
- **Sannia, Martínez-Peña, Soriano, Giorgi, Zambrini.** *Quantum* 8:1291 (2024), DOI 10.22331/q-2024-03-20-1291 [C]. Equations [S].
  - $H'=\sum_{i<j}J_{ij}\sigma^x_i\sigma^x_j+h\sum\sigma^z_i+h'_k\sum\sigma^x_i$, with input $h'_k=h(s_k+1)$.
  - Local losses: $\gamma\sum_i\mathcal D[\sigma^-_i]$.
  - Update: $\rho_{k+1}=e^{\bar{\mathcal L}(s_{k+1})\Delta t}\rho_k$, literally a grid propagator.
  - The authors prove universality and show an optimal ("sweet-spot") dissipation rate.
- **Others.**
  - Ghosh et al., *npj Quantum Inf.* 5:35 (2019), DOI 10.1038/s41534-019-0149-8 [C].
  - Martínez-Peña et al., *PRL* 127:100502 (2021), DOI 10.1103/PhysRevLett.127.100502 [C].
  - Dudas et al., *npj Quantum Inf.* 9:64 (2023), DOI 10.1038/s41534-023-00734-4 [C]: coupled dissipative oscillators.
  - Kalfus et al., arXiv:2101.11729 [A]: a single qudit.
- **Reviews.** Mujal et al., *Adv. Quantum Technol.* 4:2100027 (2021), DOI 10.1002/qute.202100027 [C]; Marković & Grollier, *Appl. Phys. Lett.* 117:150501 (2020), DOI 10.1063/5.0020014 [C].

**(i) A quantum-jump emitter as an escape-noise neuron.** This is my synthesis from standard quantum optics, not a published neuron model to my knowledge.
- A two-level emitter has drive $\Omega(I)$ set by the input current and decay $L=\sigma^-$ at rate $\gamma$.
- A spike is an emitted photon (a jump). The hazard is $\gamma\,p_e$ with $p_e=(1+z)/2$.
- The post-jump state is always $|g\rangle$, an exact reset. Photon antibunching means the waiting-time density is zero at zero delay, which gives relative refractoriness for free.
- Between jumps the evolution is exact (2×2 non-Hermitian exponential, or the Bloch affine flow).

### 4.3 State Spaces and Classical Simulation Routes

| Model | State space | Dynamics | Spike | Classical route |
|---|---|---|---|---|
| QLIF (2024) | 1 qubit population | DT map plus $T_1$ | measurement over threshold, reset to $\lvert0\rangle$ | scalar map or Bloch affine flow (exact) |
| Quantum-jump emitter (§4.2 i) | 1 qubit | GKSL | jump | Bloch affine flow plus jump hazard (exact) |
| Open Hopfield (2018) | $4^N$ | GKSL with operator-valued rates | up-jump | Liouvillian expm ($N\le6$), trajectories ($N\lesssim20$), mean field |
| Memristive QLIF (2026) | truncated Fock space | GKSL, time-dependent $\gamma$ | threshold on $\langle V\rangle$ | coherent-state closure, i.e. a classical ODE |
| Stochastic QSNN (2026) | $2^{N+M}$ | unitary plus projective measurement | Born-rule sample | exact density matrix |
| Dissipative QRC (2024) | $4^N$ | GKSL, piecewise-constant input | none (readout) | precomputed $e^{\mathcal L(s)h}$ |
| QBM / transverse-field Hopfield | $2^N$ | equilibrium (Gibbs) | none | exact diagonalisation for $N\lesssim14$ |
| CIM / SNN-CIM | $\mathbb R^{N}$ or $\mathbb R^{2N}$ | classical mean-field ODE | sign or spiking amplitude | RK4 |
| Kristensen (2021) | $2^3$ per neuron | unitary | output flip | 8×8 expm / Floquet |

---

## 5. Ranked Recommendations

### 5.1 Ten Neuron Models

1. **GIF** (spike-triggered current, moving threshold, exponential escape; Mensi 2012, Pozzorini 2013/2015). The standard data-fitted point model; linear between spikes; it composes your MAT2, GLIF and escape-noise pieces and opens Schwalger's mesoscopic theory.
2. **AdLIF with exact ZOH** (Bittar & Garner 2022; SE-AdLIF 2025; SiLIF 2025). The strongest recurrent-SNN neuron on SHD and SSC; 2-D linear and resonant; exactness removes the discretisation-stability debate.
3. **Generic linear multi-compartment neuron** (an $A$-matrix of compartments with threshold readout; PMSN 2026). One implementation covers TC-LIF, DH-SNN, PMSN and passive cable reductions.
4. **Complex resonate-and-fire family** (BRF 2024, Loihi 2 RF 2022, PRF, D-RF). An exact complex propagator, an auxiliary refractory jump $q$ and an optional reset; native on Loihi 2; the bridge to SSMs.
5. **Naud–Sprekeler two-compartment burst neuron** (with the Payeur 2021 parameters). Burst multiplexing and BAC-like dendrites; needed for burst-dependent plasticity.
6. **Wang–Buzsáki interneuron and reduced Traub–Miles pyramidal cell.** The canonical gamma (ING and PING) models; they reuse your HH integrator.
7. **Pinsky–Rinzel two-compartment cell.** The canonical conductance-based dendritic bursting model and the biological template behind TC-LIF.
8. **MPR next-generation neural mass plus the Gast–Solla–Kennedy Izhikevich-population mean field.** A population layer that can be validated directly against your exact QIF networks.
9. **Loihi 2 sigma-delta neuron and bit-accurate CUBA LIF.** Deployment-faithful discrete-time models with graded spikes.
10. **Poisson GLM** (Pillow 2008) with basis filters. The statistical neuron for fitting data and for decoding; discrete-time FIR.

*Cheap extras:*
- Morris–Lecar, FitzHugh–Nagumo and Hindmarsh–Rose, for teaching.
- Pospischil 2008 cortical and thalamic classes.
- The theta view of QIF.
- Exact OU noise (Gillespie), as infrastructure.
- Spiking-SSM blocks, which come for free once item 3 exists.

### 5.2 Five Learning Rules

1. **e-prop** (Bellec 2020). Online and local; its eligibility vectors are exact propagator sensitivities in your framework; implemented on neuromorphic hardware.
2. **The three-factor eligibility-trace framework** (Izhikevich 2007; Frémaux & Gerstner 2016). A generic substrate for reward-modulated STDP and TD learning, and later e-prop and BTSP; built on your pair and triplet traces.
3. **Clopath voltage-based STDP with homeostasis.** It reproduces the voltage and frequency dependence of plasticity, and NEST provides a reference implementation.
4. **Vogels inhibitory STDP.** E/I balance and stability for any plastic recurrent network, at almost no cost.
5. **Graupner–Brunel calcium rule.** One bistable mechanism for pair, triplet and rate dependence, with an exact event-driven route (Higgins 2014).

*Next in line:*
- **EventProp.** First choice if in-library gradient training is wanted: exact adjoints pair naturally with exact forward integration; extensions handle delays (Mészáros 2025; DelGrad 2025).
- Then burst-dependent plasticity (Payeur 2021), BTSP (Wu & Maass 2025), and Butz–van Ooyen structural plasticity.

### 5.3 Quantum Models to Implement First in a Classical Simulator

1. **Single-qubit open-system neuron:** the Bloch affine flow plus quantum-jump spikes (§4.2 i), with QLIF (Brand & Petruccione 2024) as a variant using the physical $T_1$ channel. Exact, cheap, and reuses your escape-noise and reset machinery.
2. **Open quantum Hopfield network** (Rotondo 2018). Exact Liouvillian or trajectories for small $N$ and mean field for large $N$; the $\Omega\to0$ limit (classical Glauber Hopfield) is a built-in correctness test.
3. **Dissipative quantum reservoir** (Sannia 2024). Its step $e^{\mathcal L(s)h}$ is exactly your propagator pattern; feasible for $N\le6$.
4. **Transverse-field Ising, QBM and CIM.** Exact diagonalisation for $N\lesssim12$–14; SNN-CIM as classical FHN-like ODEs.
5. **Stochastic QSNN** (Chen–Rajendran–Simeone 2026). The representative measurement-driven quantum spiking network with quantum memory.

Implement Kristensen 2021 only as a closed-system demonstration.

---

## 6. Corrections and Caveats Found During Verification

- **Kristensen et al. 2021 is not a Lindblad model.** It is unitary, and its noise was not simulated.
- **QLIF's printed no-spike map is not $\alpha e^{-\tau/T_1}$** (see §4.2 b).
- **Inagaki et al. 2016 is the 2000-node CIM.** The 100,000-spin machine is Honjo et al. 2021.
- **BRF's divergence boundary and $\omega\le1/\delta$ cap are forward-Euler artefacts.** PLIF's $\tau=1/k$ is likewise the Euler parametrisation. Stan & Rhodes and P-SpikeSSM use bilinear discretisation, so exact ZOH gives different numbers.
- **SE-AdLIF exists to fix Euler instability,** which exact integration removes.
- **Graupner–Brunel fitted parameters are in the SI tables** and were not transcribed.
- **Venues.**
  - Taken from arXiv comments: GLIF (NeurIPS 2022), PSN (NeurIPS 2023), BRF (ICML 2024), OTTT (NeurIPS 2022) and P-SpikeSSM (ICLR 2025, also confirmed by the ICLR poster page).
  - CLIF (ICML 2024, PMLR 235) is confirmed on the PMLR page.
  - Not verified: PRF, SiLIF, D-RF, and SPikE-SSM's journal DOI.

**Other sources consulted:**
- https://proceedings.mlr.press/v235/huang24n.html (CLIF)
- https://iclr.cc/virtual/2025/poster/29587 (P-SpikeSSM)
- https://github.com/lava-nc/lava (`src/lava/proc/lif/models.py`, `src/lava/proc/sdn/models.py`)
- The Europe PMC full text of Wu & Maass 2025 (PMC11695864)
- The bioRxiv full texts of Payeur et al. (10.1101/2020.03.30.015511) and Gast et al. 2020 (10.1101/806273)
- The PMC text of Graupner & Brunel (PMC3309784)
- The arXiv e-print sources of every arXiv identifier tagged [S]