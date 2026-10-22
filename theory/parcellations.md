---
title: Parcellations as Trees, and Maps as Labellings
status: draft
implemented-by:
  - domains/neuroscience/js/parcellation.js
  - domains/neuroscience/js/labels.js
  - domains/neuroscience/js/anatomy.js
  - domains/neuroscience/js/maps.js
references: [Amunts2020, Amunts2015, Eickhoff2005, Desikan2006, Schaefer2018, Yeo2011, Wang2020, Kleven2023, Dickscheid2026]
---

# Parcellations as Trees, and Maps as Labellings

## 1. Regions in a Hierarchy

A parcellation names the parts of the brain and says which contain which. Its natural form is a tree: the cerebral cortex holds its lobes, a lobe its gyri; a cytoarchitectonic area holds its two hemispheric parts; a functional network holds its parcels; the isocortex holds its areas and each area its layers. Several roots are allowed, so the structure is a forest.

**Definition 1 (parcellation).** A parcellation is a finite set $R$ of regions with a partial order $\le$ (containment) whose Hasse diagram is a forest: every region has at most one parent. The *down-set* of $r$ is $\downarrow r = \{ s : s \le r \}$, its *leaves* are the minimal elements of $\downarrow r$, and its *depth* is the length of the chain from a root.

Two regions $r, s$ have a greatest lower bound in the order only when one contains the other; what they always have, when they share a root, is a *lowest common ancestor*, the least region containing both, which is the meet of $r$ and $s$ in the order of the tree with a top added. In the Allen ontology the lowest common ancestor of a motor layer and a somatosensory layer is the isocortex; in Julich-Brain, of a left and a right part, the area.

Labels and sides travel with the regions. The side of a region is read from its name in the conventions of the atlases ("– left hemisphere", "Left-", "ctx-lh-", "_LH_", "lh.", "_L"), and a region without a side has that of its nearest ancestor which states one.

## 2. Labelled Maps

**Definition 2 (labelled map).** A labelled map of a parcellation in a space is a volume (or several, its *fragments*) whose voxels carry labels, together with the assignment of each label, in its fragment, to one region. The voxels of a region are those whose label belongs to its down-set:

$$V(r) = \ell^{-1}\big(L(\downarrow r)\big), \tag{1}$$

where $\ell$ is the labelling of the voxels and $L(S)$ the set of labels of the regions in $S$.

**Proposition 1.** $V$ is monotone, $s \le r \Rightarrow V(s) \subseteq V(r)$, and when labels sit only on leaves, $V(r) = \bigcup_{s \in \mathrm{leaves}(r)} V(s)$ is a disjoint union.

*Proof.* $\downarrow s \subseteq \downarrow r$ gives the first; for the second, $L(\downarrow r)$ is then $L(\mathrm{leaves}(r))$, and the preimages of distinct labels are disjoint. $\square$

So a region's statistics are sums over its leaves. The Allen annotation labels every voxel with the finest structure, so that the voxels of the isocortex are the union of the voxels of its layers; Julich-Brain labels each hemisphere in a fragment of its own, the same label numbers meaning different areas on the two sides, which is why a label is keyed with its fragment.

**Proposition 2 (statistics).** For a region with $n$ voxels of indices $v_1, \dots, v_n$ on a grid with affine $A$: its volume is $n\,|\det A_{3 \times 3}|$, its centroid $A\,\bar v$ with $\bar v$ the mean index (exactly, by the affinity of $A$), and its bounds the image of the index box's corners, when $A$ is axis-aligned.

Maps are read from files passed as bytes (NIfTI, NRRD), and the region at a world point is that of the nearest voxel, the grid's cells being the half-open intervals $[i - \tfrac12, i + \tfrac12)$.

### 2.1 Refinement

The regions at one depth of a complete tree partition the labelled voxels, and each level refines the one above: a hierarchical parcellation is a chain in the lattice of partitions of the voxel set, ordered by refinement. Two parcellations drawn on one grid, such as Schaefer's parcels and the Desikan–Killiany gyri, are compared through their *confusion*, the counts $c_{ab} = |V(a) \cap V(b)|$; the parcellation they generate together is the meet of the two partitions.

### 2.2 Overlap

For masks $A, B$ on one grid, the Dice coefficient and the Jaccard index are

$$D = \frac{2\,|A \cap B|}{|A| + |B|}, \qquad J = \frac{|A \cap B|}{|A \cup B|}. \tag{2}$$

**Proposition 3.** $J = D / (2 - D)$ and $D = 2J / (1 + J)$; both lie in $[0, 1]$, and equal $1$ exactly when $A = B$.

*Proof.* With $i = |A \cap B|$, $u = |A \cup B| = |A| + |B| - i$: $D = 2i/(u + i)$, so $2 - D = 2u/(u + i)$ and $D/(2 - D) = i/u = J$. $\square$

## 3. Statistical Maps

A cytoarchitectonic area has no sharp border in the average brain: its position varies between people. Julich-Brain therefore gives, for each area, a *probability map*, the fraction of the ten post-mortem brains in which the voxel lies in the area after the brains are brought to the template (Amunts et al. 2020; Amunts and Zilles 2015).

**Definition 3 (statistical map).** A statistical map gives each region $r$ a volume $p_r$ with values in $[0, 1]$ on one grid.

The *maximum probability map* (Eickhoff et al. 2005) makes a labelled map of it: at each voxel the region of highest probability, provided that probability reaches a threshold:

$$\ell(v) = \arg\max_r p_r(v) \ \text{ if } \max_r p_r(v) \ge \tau, \text{ else } 0. \tag{3}$$

A point measured with uncertainty is assigned by weighting: for a point $x$ and an isotropic Gaussian of standard deviation $\sigma$,

$$\bar p_r(x) = \frac{\sum_{v} p_r(v)\, w(v)}{\sum_v w(v)}, \qquad w(v) = \exp\!\left(-\frac{|c(v) - x|^2}{2\sigma^2}\right), \tag{4}$$

over the voxels within $3\sigma$ of $x$; at $\sigma = 0$ the trilinear interpolate of $p_r$ at $x$. A constant map returns its constant, and a point deep in one region its probability there, which the tests check.

*Remark.* The gap maps of Julich-Brain fill the cortex not yet mapped, so that every cortical voxel has a label; they are regions like the others in the configuration, named as gaps.

## 4. The Parcellations in the Domain

| Parcellation | Principle | Regions | Source of the tree and labels |
|---|---|---|---|
| Julich-Brain v3.1 | Cytoarchitecture: borders found by statistical analysis of cell-body densities in ten brains; 207 areas with gap maps, each in two hemispheric parts | 771 nodes, 454 hemispheric leaves | The EBRAINS configuration (siibra-configurations) and its map's indices |
| Schaefer 2018 | Functional connectivity at rest, parcels within the seven networks of Yeo et al. (2011) | 100 or 400 parcels in 7 networks | TemplateFlow's `dseg.tsv`, whose names carry network and side |
| Desikan–Killiany | Gyri bounded by sulci, by a protocol; 34 regions a hemisphere, grouped by lobe | 68 leaves | FreeSurfer's lookup table, transcribed in `anatomy.js` and checked against it |
| Allen Mouse Brain Atlas ontology | Anatomy, with every isocortical area divided into layers | 1,327 structures | The structure graph of the Allen API; the 2017 annotation labels 670 of them at 50 µm |
| Waxholm Space rat atlas v4 | Anatomy delineated in MRI and DTI | 222 structures | The EBRAINS configuration (planned) |

The neuraxis in `anatomy.js` is the developmental tree of the central nervous system, from the three vesicles of the neural tube to the structures the other parcellations name; it has no map, and serves understanding.
