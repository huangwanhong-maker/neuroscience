---
title: From scalp maps to sources
status: promoted
date: 2026-10-22
---

# From Scalp Maps to Sources

The head module interpolates potentials over the scalp and shows them above the cortex. The step the user is after, mapping brain-wave data to the brain itself, is the inverse problem of electroencephalography: a forward model (a spherical or boundary-element head of scalp, skull and brain with their conductivities) gives the potential at each electrode from a dipole at each cortical point, and a regularised inverse (minimum norm, LORETA, beamformers) estimates the sources. It belongs to a `signals` module and to the inference foundation:

- the three-shell spherical head model has a closed form (the Legendre series of the lead field), and the scalp model here already gives the sphere's centre and radius;
- a boundary-element model would use the scalp and brain surfaces that the application already extracts;
- the parcellations give the regions over which source power is summed, which is what "band power by region" means.

A first step that needs no inverse: the surface Laplacian of the spherical spline (Perrin et al. 1989 give it in closed form), which sharpens the scalp map toward the sources beneath.

*Promoted (2026-10-23):* the forward models, inverse estimates and recordings are the modules `signals`, `forward` and `inverse` ([theory](../../theory/forward-and-inverse.md)), drawn by the Brain Atlas's Signals mode (the infrastructure's ADR 0034).
