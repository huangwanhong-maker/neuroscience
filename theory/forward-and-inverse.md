---
title: Signals of the Brain, from Currents to Sensors and Back
status: draft
implemented-by:
  - domains/neuroscience/js/signals.js
  - domains/neuroscience/js/forward.js
  - domains/neuroscience/js/inverse.js
  - domains/neuroscience/js/maps.js
  - domains/neuroscience/js/volume.js
references: [RushDriscoll1968, Frank1952, deMunck1988, Zhang1995, Sarvas1987, Hamalainen1993, HamalainenIlmoniemi1994, Lin2006, Dale2000, PascualMarqui2002, Welch1967, Kane2017, Berger1929, Pfurtscheller1999, Friston2007, KnutssonWestin1993, RousseeuwCroux1993]
---

# Signals of the Brain, from Currents to Sensors and Back

Electroencephalography (EEG) measures potentials on the scalp; magnetoencephalography (MEG) measures magnetic fields outside the head; functional MRI measures, voxel by voxel, a slow haemodynamic consequence of activity. The first two are made by currents in the cortex and reach the sensors through the head; to say where in the brain a signal comes from, one needs a model of that passage (the *forward problem*) and a rule for inverting it (the *inverse problem*). The third is already a volume in the brain's space and needs only to be read through the cortex.

## 1. The Quasi-Static Head

At the frequencies of the EEG (below a few hundred hertz) the head is a conductor in which capacitive, inductive and propagation effects are negligible: Maxwell's equations reduce to their quasi-static forms (Hämäläinen et al. 1993, §II). The current density is split into a *primary* part $J^p$, the net effect of the neurons' own currents, and the *volume* current $\sigma E = -\sigma \nabla \varphi$ that it drives through the tissue of conductivity $\sigma$. Conservation of charge, $\nabla \cdot J = 0$, gives Poisson's equation

$$\nabla \cdot (\sigma \nabla \varphi) = \nabla \cdot J^p, \tag{1}$$

with $\sigma\, \partial_n \varphi = 0$ on the scalp, where the head meets the insulating air. The primary current of a patch of cortex a few millimetres across, whose pyramidal cells are aligned and act together, is a *current dipole* $J^p = q\, \delta(r - r_0)$, with moment $q$ in ampere-metres; a few square centimetres of cortex acting together make some 10 nA·m.

## 2. The Potential in Concentric Shells

**Definition 1 (shell model).** A head of $N$ concentric spherical shells of radii $r_1 < \dots < r_N = R$, the $k$-th of conductivity $\sigma_k$, the innermost holding the sources.

Rush and Driscoll (1968) take three shells, brain, skull and scalp, at radii $0.87R$, $0.92R$ and $R$, the skull 80 times less conductive than the others (`THREE_SHELLS`).

In each shell the potential is harmonic away from the source, so it expands in Legendre polynomials of the angle $\gamma$ to the source's direction. A point source of current $I$ at $r_0$ in the first shell gives, in that shell beyond $|r_0|$,

$$\varphi_1 = \frac{I}{4\pi\sigma_1} \sum_{n \ge 0} \Big( \frac{|r_0|^n}{r^{n+1}} + a^1_n r^n \Big) P_n(\cos\gamma),$$

and in the $k$-th shell $\sum_n (a^k_n r^n + b^k_n r^{-(n+1)}) P_n(\cos\gamma)$. Order by order, the coefficients solve a linear system of $2N - 1$ equations: continuity of $\varphi$ and of $\sigma \partial_r \varphi$ at each interface, and $\partial_r \varphi = 0$ at the scalp. Let $T_n$ be the scalp's potential per unit of the singular coefficient, for $R = 1$ (`shellModel`).

**Proposition 2.** For a homogeneous sphere ($N = 1$), $T_n = (2n+1)/n$.

*Proof.* With $R = 1$, $\partial_r (\rho^n r^{-(n+1)} + a_n r^n) = 0$ at $r = 1$ gives $a_n = \rho^n (n+1)/n$, and the scalp's potential per unit of $\rho^n$ is $1 + (n+1)/n = (2n+1)/n$ (Frank 1952). $\square$

A dipole is the limit of two opposite sources, so its potential is the derivative of the point source's along $q$ (de Munck 1988; Zhang 1995). With $\rho = |r_0|/R$, $s_0$ and $s$ the directions of $r_0$ and of the scalp point, and $c = s_0 \cdot s$:

$$V = \frac{1}{4\pi\sigma_1 R^2} \sum_{n \ge 1} T_n\, \rho^{\,n-1} \Big[ n\, (q \cdot s_0)\, P_n(c) + P_n'(c)\, \big(q \cdot s - c\, (q \cdot s_0)\big) \Big]. \tag{2}$$

The first term is the radial part of $q$, the second the tangential. The series converges geometrically in $\rho$; the code sums it until $\rho^{n-1} < 10^{-14}$, and clamps sources to $\rho \le 0.97$ of the brain's shell.

*Remark.* The skull's low conductivity damps the higher orders: $T_n$ for three shells falls well below the homogeneous value as $n$ grows, and the scalp sees a smoothed image of the cortex. The checks confirm the homogeneous case exactly, the central dipole's closed form, and (2) against a numerical derivative of the point source's potential to $3.5 \times 10^{-11}$.

## 3. The Magnetic Field Outside a Sphere

Outside a spherically symmetric conductor the field of a dipole is independent of the conductivities and has a closed form (Sarvas 1987, eq. 25). With $a = r - r_0$, $a = |a|$, $r = |r|$,

$$B(r) = \frac{\mu_0}{4\pi F^2} \Big( F\, q \times r_0 - \big((q \times r_0) \cdot r\big) \nabla F \Big), \qquad F = a\,(r a + r^2 - r_0 \cdot r), \tag{3}$$

$$\nabla F = \Big( \frac{a^2}{r} + \frac{a \cdot r}{a} + 2a + 2r \Big) r - \Big( a + 2r + \frac{a \cdot r}{a} \Big) r_0 .$$

**Proposition 3.** A radial dipole ($q \parallel r_0$) makes no field outside the sphere.

*Proof.* Then $q \times r_0 = 0$, and both terms of (3) vanish. $\square$

So MEG sees the currents of the sulcal walls, tangential to the head, and is blind to those of the gyral crowns, while EEG sees both. The Signals mode lets one turn a dipole and watch the field vanish while the potential stays.

## 4. A Head Brought to a Sphere

The template's head is not a sphere. Its scalp is cast from the template (see `head-and-electrodes.md`), and a sphere is fitted about the same centre with radius $R$, the median distance of the 10–10 electrodes. Each point $p$ is moved along its direction $u$ from the centre in the ratio $R/\rho(u)$ of the sphere's radius to the scalp's in that direction (`radialNormaliser`): electrodes land on the sphere and sources keep their fractional depth beneath the scalp. The approximation is worst where the head departs most from a sphere, at the temporal base and the frontal pole; a boundary-element model would replace it behind the same lead-field interface.

The *lead field* $L$ ($n$ sensors by $m$ sources) holds, for each source with its orientation fixed normal to the cortex, the potential (µV) or field (fT) per nA·m at each sensor. The sources are the cortex's vertices thinned to one per 6 mm cube (`decimate`), about 4,700 on the template.

## 5. The Inverse

With $m \gg n$, many currents explain the same data, and a prior must choose. All the estimates used here are linear, $\hat J = K \varphi$.

**Definition 4 (minimum norm).** For a diagonal source weighting $R$ and noise covariance $C$, the minimum-norm operator is

$$K = R L^T (L R L^T + \lambda^2 C)^{-1}, \tag{4}$$

the current of least $R^{-1}$-norm that explains the data up to the noise (Hämäläinen and Ilmoniemi 1994). The depth weighting $R_{ss} = \|L_{\cdot s}\|^{-2\gamma}$ with $\gamma = 0.8$ offsets the bias toward superficial sources (Lin et al. 2006). The regularisation is set from an assumed signal-to-noise ratio of amplitudes, $\lambda^2 = \mathrm{tr}(L R L^T) / (n\, \mathrm{SNR}^2)$, with $\mathrm{SNR} = 3$ by default. EEG data and lead fields are first referenced to their average, the reference that makes the problem independent of the recording's own.

**Definition 5 (noise-normalised estimates).** dSPM divides each source's estimate by its standard deviation under the noise alone, $\sqrt{(K C K^T)_{ss}}$ (Dale et al. 2000). sLORETA takes $R = I$ and divides by the square root of the resolution matrix's diagonal, $\sqrt{(K L)_{ss}}$ (Pascual-Marqui 2002).

**Proposition 6.** Without noise, sLORETA's estimate of a single source peaks at that source.

*Proof sketch.* With $\varphi = L_{\cdot t}$, the estimate at $s$ is $(KL)_{st}/\sqrt{(KL)_{ss}}$. $KL$ is symmetric positive semidefinite when $R = I$ and $C = I$, so by the Cauchy–Schwarz inequality for the form it defines, $(KL)_{st}^2 \le (KL)_{ss} (KL)_{tt}$, with equality at $s = t$; the estimate is therefore at most $\sqrt{(KL)_{tt}}$, which it attains at $t$. $\square$

The checks place a source at random 30 times and recover it exactly each time.

**Proposition 7 (power).** For data of covariance $C_d$ over a window, the mean square of the estimate at $s$ is $(K H C_d H K^T)_{ss}$ times the square of the method's scale, with $H$ the average-reference projector.

This is how band power is mapped: the covariance of the band-passed recording, not the estimates at every sample.

## 6. The Recording

A recording is a set of channels sampled at a common rate. The readers take EDF and EDF+ (with the annotations of its time-stamped lists), BDF, BrainVision and tables; channel labels are normalised to the 10-10 system, and the old names T3, T4, T5 and T6 become T7, T8, P7 and P8.

- **Bands.** Delta (1–4 Hz), theta (4–8), alpha (8–13), beta (13–30) and gamma (30–45), after the glossary of the International Federation of Clinical Neurophysiology (Kane et al. 2017).
- **Filtering.** A zero-phase band-pass in the frequency domain, with raised-cosine edges and the record mirrored at its ends; the phase is untouched, so that maps at an instant are not shifted in time.
- **Spectra.** Welch's method (Welch 1967): Hann windows of 2 s overlapping by half, their periodograms averaged.
- **The analytic signal** gives each band's envelope and phase.
- **Global field power** is the spatial standard deviation of the average-referenced potential at each instant, a measure of the strength of the scalp's field independent of reference.

## 7. fMRI on the Cortex

A statistical map of fMRI is a volume in the template's space. It is read at each vertex of the cortex along the inward normal, from 1 mm outside to 6 mm within, and the value of largest magnitude is kept (`projectToSurface`): the template's surface is an average's, and a person's activity lies within a few millimetres of it.

One person's map, unsmoothed, is mostly specks: the noise passes any threshold at single voxels. Group analyses smooth first (Friston et al. 2007, ch. 2), and so may the reader here.

**Proposition 8 (smoothing).** The separable Gaussian with $\sigma = \mathrm{FWHM}/\sqrt{8 \ln 2}$ on each axis, in millimetres, spreads a point into a Gaussian of variance $\sigma^2$ on each axis, up to the truncation at $3\sigma$.

Two treatments of the mask's edge are offered (`smooth`). *Normalised convolution* (Knutsson and Westin 1993) divides by the kernel's mass inside the mask, so a constant stays constant to the edge. *Zero padding*, as SPM does, counts the outside as 0 and pulls the edge down; for a statistic it is the cautious choice, since edge voxels averaged over fewer neighbours keep more of their noise. The Brain Atlas uses zero padding.

Smoothing shrinks the noise's spread, so a smoothed z map no longer counts standard deviations. It is restandardised by its robust spread (`standardise`): $(x - \mathrm{med})/(1.4826\, \mathrm{MAD})$, over the voxels inside the mask, the median and scaled median absolute deviation estimating the null's centre and standard deviation for a map that is mostly null (Rousseeuw and Croux 1993). Peaks are the local maxima of the drawn map among their 26 neighbours, kept from the strongest down at least 12 mm apart.

*Caveat.* Thresholds on a restandardised map are descriptive, not inferential: no correction for multiple comparisons is made, and a map of one person on the template's cortex is placed by its coordinates, not by that person's anatomy.

## 8. What the Real Data Show

The checks run on PhysioNet's EEG Motor Movement/Imagery Dataset (subject 1) and the Individual Brain Charting maps (subject 1), when they are fetched:

- **The alpha rhythm.** Closing the eyes raises the alpha power at O1 thirteenfold, more at the back of the head than at the front, with its peak at 10 Hz, as Berger (1929) first described; its sLORETA estimate lies at the occipital poles.
- **The mu rhythm.** Opening and closing a fist lowers the power of 8–13 Hz most over the central gyri, the event-related desynchronisation of the sensorimotor rhythm (Pfurtscheller and Lopes da Silva 1999).
- **Moving the right hand.** The fMRI map peaks in the left central gyri.
