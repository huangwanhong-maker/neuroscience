---
title: Parcellations in the lattice of partitions
status: seed
date: 2026-10-22
---

# Parcellations in the Lattice of Partitions

A hierarchical parcellation is a chain in the lattice of partitions of the voxel set, ordered by refinement; two parcellations on one grid have a meet (their common refinement, from the confusion matrix) and a join (the coarsest partition both refine). Questions worth asking with morphe's structures:

- How far is Schaefer's parcellation from a refinement of the Desikan–Killiany gyri, measured by a distance in the lattice (the variation of information, or the Rand index)?
- Is there a canonical coarsening of Julich-Brain's 207 areas to lobes, and does it agree with the gyral lobes?
- Across atlases and species, which groupings are preserved by the maps between spaces, and can the preserved part be stated as a functor between the two trees?

The confusion of two labellings is already computed (`maps.js`); the lattice operations would follow in a few lines, and the distances in a few more.
