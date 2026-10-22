---
title: The Head and the 10–20 System
status: draft
implemented-by:
  - domains/neuroscience/js/head.js
references: [Jasper1958, Oostenveld2001, Perrin1989, Umeyama1991]
---

# The Head and the 10–20 System

## 1. Landmarks and Head Frames

Four landmarks of the head are found by touch: the *nasion*, the depression between the eyes at the root of the nose; the *inion*, the bump of the external occipital protuberance; and the left and right *preauricular points*, in front of the ears. The *vertex* is the top of the head between them. Electroencephalography places its electrodes by distances along the scalp between these, so that a montage transfers from one head to another in proportion.

Two head frames are in common use, and both are built from the three landmarks of the face and ears:

- **CTF.** The origin is midway between the preauricular points; the $x$ axis passes through the nasion; the $y$ axis points to the left, in the plane of the three; $z$ is up.
- **Neuromag.** The $x$ axis runs from the left to the right preauricular point; the $y$ axis points to the nasion, orthogonal to $x$; the origin is the foot of the perpendicular from the nasion on the line of the ears; $z$ is up.

Each is an orthonormal frame $(e_x, e_y, e_z)$ with an origin $o$, and the affine from world to head coordinates is $p \mapsto E^T (p - o)$ with $E$ the matrix of the axes.

## 2. The Scalp as a Surface

**Definition 1 (scalp).** A scalp is a star-shaped surface about a centre $c$: a frame $(e_x, e_y, e_z)$ at $c$ and a radius function $\rho$ on the unit sphere, the surface being $\{ c + \rho(u)\, u \}$ with $u$ ranging over unit directions in the frame.

An ellipsoid with semi-axes $a, b, c$ along the frame has $\rho(u) = \big((u_x/a)^2 + (u_y/b)^2 + (u_z/c)^2\big)^{-1/2}$. A head mask gives $\rho$ by casting a ray from the centre and taking the last voxel inside; the surface found lies within a voxel's half-diagonal of the true one.

A *section* from $p$ to $q$ is the curve on the surface in the plane through $c$, $p$ and $q$: the directions turn from $\hat p$ to $\hat q$ about the normal $\hat p \times \hat q$ of that plane, and each direction is sent to the surface. When $p$ and $q$ are opposite, as the nasion and the inion are, the plane is fixed by a third direction, the vertex. Arc length along a section is the limit of the lengths of inscribed polygons, which the code sums over four hundred points; the point at a fraction of the arc is found on that polygon and sent back to the surface radially. On a sphere a section is a great circle, and arc fractions are angle fractions.

## 3. The 10–20 System

Jasper (1958) placed electrodes at 10 and 20 per cent of the distances between the landmarks; the 10–10 system (the American Clinical Neurophysiology Society's nomenclature; Oostenveld and Praamstra 2001, who also define the 10–5 positions) fills the 20 per cent gaps. The construction, as the domain performs it:

1. **The midline.** The arc from the nasion over the vertex to the inion is divided in tenths: $\mathrm{Fpz}$ at $0.1$, $\mathrm{AFz}$, $\mathrm{Fz}$ at $0.3$, $\mathrm{FCz}$, $\mathrm{Cz}$ at $0.5$, $\mathrm{CPz}$, $\mathrm{Pz}$ at $0.7$, $\mathrm{POz}$, $\mathrm{Oz}$ at $0.9$.
2. **The coronal arc.** From the left to the right preauricular point over the vertex: $\mathrm{T7}$ at $0.1$, $\mathrm{C5}$, $\mathrm{C3}$ at $0.3$, $\mathrm{C1}$, $\mathrm{Cz}$, $\mathrm{C2}$, $\mathrm{C4}$, $\mathrm{C6}$, $\mathrm{T8}$ at $0.9$. The midpoint of this arc should be the $\mathrm{Cz}$ of the midline; the discrepancy between the two is reported.
3. **The ring.** The closed curve through $\mathrm{Fpz}$, $\mathrm{T7}$, $\mathrm{Oz}$ and $\mathrm{T8}$, the circumference of the head at the 10 per cent level, divided in twentieths from $\mathrm{Fpz}$ over the left: $\mathrm{Fp1}$ at $0.05$, $\mathrm{AF7}$, $\mathrm{F7}$ at $0.15$, $\mathrm{FT7}$, $\mathrm{T7}$ at $0.25$, $\mathrm{TP7}$, $\mathrm{P7}$ at $0.35$, $\mathrm{PO7}$, $\mathrm{O1}$ at $0.45$, $\mathrm{Oz}$ at $0.5$, and their fellows on the right.
4. **The coronal lines.** Each of the lines AF, F, FC, CP, P and PO runs from its left ring point through its midline point to its right ring point; each half is a section, divided into four equal parts (two for AF and PO): $\mathrm{F3}$ is midway from $\mathrm{F7}$ to $\mathrm{Fz}$, $\mathrm{F5}$ and $\mathrm{F1}$ at the quarters.

On a sphere these arcs are great circles, except the ring, which is a parallel: it is defined here, for any scalp, as the curve of points one fifth of the way up every meridian from the landmark level to the vertex (one tenth of the arc from landmark to landmark through the vertex), so that it passes through the four points of rule 3 and reduces to the parallel on a sphere.

**Proposition 1 (the sphere).** On a sphere with the landmarks on its equator, the positions have the polar angles (from the vertex) and azimuths (from the right, the nasion at $90°$): $\mathrm{Cz}$ at $0$; $\mathrm{Fz}$, $\mathrm{Pz}$, $\mathrm{C3}$, $\mathrm{C4}$ at $36°$; the ring at $72°$, with $\mathrm{Fpz}$ at azimuth $90°$, $\mathrm{Fp1}$ at $108°$, $\mathrm{AF7}$ at $126°$, $\mathrm{F7}$ at $144°$, $\mathrm{FT7}$ at $162°$, $\mathrm{T7}$ at $180°$, and so on by $18°$; and $\mathrm{F3}$ the midpoint of the great-circle arc from $\mathrm{F7}$ to $\mathrm{Fz}$.

*Proof.* The midline and the coronal arc are half great circles of $180°$, so a tenth is $18°$ of polar angle; the ring is the parallel at $72°$, of which a twentieth is $18°$ of azimuth; and the coronal lines are great-circle arcs, divided by angle. $\square$

The tests check every one of these, and on an ellipsoid that the positions lie on the surface, mirror across the midline, and sit at the stated fractions of their arcs.

*Remark.* The older names $\mathrm{T3}, \mathrm{T4}, \mathrm{T5}, \mathrm{T6}$ are $\mathrm{T7}, \mathrm{T8}, \mathrm{P7}, \mathrm{P8}$. The positions below the ring, at the landmark level ($\mathrm{F9}$, $\mathrm{FT9}$, $\mathrm{TP9}$, $\mathrm{P9}$ and their fellows), are not constructed yet.

## 4. A Template Head Brought to a Subject

Two ways are provided to fit a template head to a person.

**Scaling to measurements.** The subject's head length (nasion to inion), breadth (between the preauricular points) and height (from the line of the ears to the vertex), as straight distances, divided by the template's, give three scales applied about the template's centre; the electrodes are then placed again on the scaled scalp, since arc fractions are not preserved by an anisotropic scaling.

**A similarity from matched points** (Umeyama 1991). For matched point sets $x_i, y_i$, $i = 1 \dots n$, the similarity $y = sRx + t$ minimising $\sum |y_i - sRx_i - t|^2$ is found in closed form: with $\Sigma = \frac1n \sum (y_i - \bar y)(x_i - \bar x)^T = U D V^T$ and $S = \mathrm{diag}(1, 1, \det(UV^T))$,

$$R = U S V^T, \qquad s = \frac{\mathrm{tr}(DS)}{\sigma_x^2}, \qquad t = \bar y - sR\bar x, \tag{1}$$

where $\sigma_x^2 = \frac1n \sum |x_i - \bar x|^2$. Three digitised landmarks suffice; with $s = 1$ the fit is rigid. The tests recover a known similarity to $10^{-14}$.

## 5. Values over the Scalp

Potentials are measured at the electrodes and wanted everywhere on the scalp. Perrin et al. (1989) interpolate on the sphere by spherical splines: for electrode directions $e_i$ and values $v_i$,

$$v(x) = c_0 + \sum_i c_i\, g(\cos \gamma_i(x)), \qquad g(t) = \frac{1}{4\pi} \sum_{n=1}^{N} \frac{2n + 1}{\big(n(n+1)\big)^m} P_n(t), \tag{2}$$

with $\gamma_i(x)$ the angle between $x$ and $e_i$, $P_n$ the Legendre polynomials, $m = 4$ and the series taken to $N$ terms; the coefficients solve $G c + c_0 \mathbf{1} = v$ with $\sum_i c_i = 0$, where $G_{ij} = g(\cos \gamma_{ij})$.

**Proposition 2.** The interpolant reproduces the data at the electrodes, and a constant field is interpolated as that constant.

*Proof.* The system's first block of equations is $v(e_i) = v_i$. For $v_i \equiv k$, $c = 0$ and $c_0 = k$ solve the system, and the solution is unique when $G$ is nonsingular (distinct electrodes), so the interpolant is $k$. $\square$

Since the interpolant is a function of direction from the centre, it is shown on the brain's surface as well as on the scalp: the value above each point of the cortex. This is a map of the scalp potential, not of its sources; the projection is radial, and a cortical projection in the sense of Okamoto et al. (2004) would follow the scalp's normals to the cortex.

*Caveat.* The landmarks of the template head are provisional, placed by rule at the scalp in the direction of the usual positions; the positions that follow are those of a standard head. Digitised landmarks and electrodes should replace them for a person.
