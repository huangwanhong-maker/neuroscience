---
title: Reference Spaces of the Brain
status: draft
implemented-by:
  - domains/neuroscience/js/affine.js
  - domains/neuroscience/js/nifti.js
  - domains/neuroscience/js/spaces.js
  - domains/neuroscience/js/stereotaxic.js
references: [TalairachTournoux1988, Evans1993, Mazziotta2001, Fonov2011, Evans2012, Amunts2013, Wang2020, Johnson2010, Brett2001, Lancaster2007]
---

# Reference Spaces of the Brain

## 1. The Stereotaxic Idea

A brain is studied in many individuals, by many methods, and the results must be brought to one place to be compared. A *reference space* is that place: a convention of origin, axes and unit, together with a rule for bringing any brain to it. Talairach and Tournoux (1988) fixed the convention that every later space inherits. The origin is the anterior commissure (AC), a bundle of fibres crossing the midline; the $y$ axis runs from it through the posterior commissure (PC), the *AC–PC line*; the midsagittal plane is $x = 0$; $z$ completes a right-handed frame pointing up. A brain is brought to the atlas by the *proportional grid*: the box bounding the brain is divided by the planes through AC and PC and by the midline into twelve compartments, and each is scaled linearly to the atlas's. The map is therefore piecewise linear, continuous, and different in each compartment.

The atlas was one brain, that of a woman of sixty. Its coordinates are still reported, so a map from it to the present spaces is needed (§5).

## 2. Templates and Averages

The Montreal Neurological Institute replaced the single brain by averages (Evans et al. 1993; Evans et al. 2012 for the history).

- **MNI 305.** 305 normal brains, each fitted linearly to a Talairach-compatible frame, were averaged. The average is blurred, but its frame is an average frame, and it is the origin of the MNI series: every later template is fitted to it.
- **ICBM 152 linear (MNI 152 linear).** 152 brains of the International Consortium for Brain Mapping fitted linearly to MNI 305 (Mazziotta et al. 2001); the template of SPM 99 and after. Its 1 mm grid has $181 \times 217 \times 181$ voxels from $(-90, -126, -72)$.
- **MNI 152 nonlinear, 6th generation.** The same brains fitted nonlinearly, iterated six times; distributed with FSL, where the Harvard–Oxford atlases are drawn. $182 \times 218 \times 182$ voxels from $(-91, -126, -72)$ in RAS.
- **ICBM 2009 a, b, c.** Fonov et al. (2011) made unbiased nonlinear averages, each brain fitted to the running average and the average remade, so that the template is not biased toward any one brain. The 2009c sampling is $193 \times 229 \times 193$ voxels from $(-96, -132, -78)$ at 1 mm; the 2009b versions are at 0.5 mm. The asymmetric versions keep the brain's left–right differences; the symmetric ones average the brain with its mirror image. The 2009c asymmetric template is the reference space of the EBRAINS human brain atlas and of fMRIPrep, and of the Brain Atlas here.
- **Colin 27.** One individual scanned 27 times and averaged (Holmes et al. 1998), then fitted to MNI 305: a sharp single brain on the grid of MNI 152 linear.
- **BigBrain.** A different kind of template: one brain cut into 7404 sections of 20 µm, stained for cell bodies, and reconstructed at 20 µm (Amunts et al. 2013). It is placed in MNI space by a nonlinear fit, so that cortical layers and the borders of cytoarchitectonic areas can be seen where the averages only blur.
- **fsaverage.** FreeSurfer's average cortical surface (Fischl et al. 1999), on which surface-based parcellations are defined vertex by vertex; its volume is the conformed cube of $256^3$ voxels.

The grids are verified in the tests against TemplateFlow's descriptions and the files' own headers (`tests/fixtures/templateflow.json`, `nifti-headers.json`).

*Remark.* "MNI space" names a family, not one space. The linear and the nonlinear templates differ by a few millimetres at the cortex; the 2009c template is larger than the 6th-generation one. A coordinate should name its template.

## 3. Placing a Volume

**Definition 1 (volume).** A volume is a grid of $n_1 \times n_2 \times n_3$ voxels with a value at each, and an affine map $A \in \mathrm{GL}_4$ with last row $(0, 0, 0, 1)$, the *voxel-to-world affine*: voxel $(i, j, k)$ is centred at $A\,(i, j, k, 1)^T$. World coordinates are RAS: $x$ to the right, $y$ to the anterior, $z$ to the superior, in millimetres.

The storage order of the voxels says nothing about where they are; only $A$ does. The *orientation code* of a grid names, for each voxel axis, the anatomical direction in which it mostly runs: the columns of the $3 \times 3$ part of $A$, normalised, are matched to the world axes, the strongest matches first. FSL's MNI 152 is stored with its first axis running to the left (LAS); the templates of TemplateFlow and the BIC are RAS; the Allen framework is PIR (§4).

**Proposition 1 (reorientation).** Permuting and reversing the voxel axes of a volume, with the affine composed with the corresponding index map $M$ (a signed permutation matrix with the offsets $n - 1$ on reversed axes), leaves every voxel at its world position.

*Proof.* The new voxel $(a, b, c)$ holds the value of the old voxel $M (a, b, c, 1)^T$, whose centre is $A M (a, b, c, 1)^T$; the new affine is $A M$. $\square$

**Proposition 2 (centroids).** The centroid of the centres of a set of voxels $S$ is the image under $A$ of the mean of their indices.

*Proof.* $A$ is affine, and affine maps commute with averages: $\frac{1}{|S|}\sum_{v \in S} A v = A\left(\frac{1}{|S|}\sum_{v \in S} v\right)$. $\square$

So a region's centroid is computed exactly from index sums, and its volume is its voxel count times $|\det A_{3\times3}|$.

### 3.1 NIfTI

The NIfTI-1 header (348 bytes) places a volume by one of three methods (nifti1.h). Method 1 uses the voxel sizes alone. Method 2, the *qform*, gives a rotation as the unit quaternion $(a, b, c, d)$ with $a = \sqrt{1 - b^2 - c^2 - d^2} \ge 0$:

$$R = \begin{pmatrix} a^2 + b^2 - c^2 - d^2 & 2bc - 2ad & 2bd + 2ac \\ 2bc + 2ad & a^2 + c^2 - b^2 - d^2 & 2cd - 2ab \\ 2bd - 2ac & 2cd + 2ab & a^2 + d^2 - c^2 - b^2 \end{pmatrix}, \tag{1}$$

and $(x, y, z)^T = R\,(s_1 i,\ s_2 j,\ q\, s_3 k)^T + (q_x, q_y, q_z)^T$, with $s_m$ the voxel sizes and $q = \pm 1$ the sign in `pixdim[0]` that lets a left-handed grid be described. Method 3, the *sform*, gives the top three rows of $A$ directly. The sform is used when its code is set, else the qform, else method 1.

**Proposition 3.** For a unit quaternion, $R$ in (1) is a rotation, and every rotation arises so.

*Proof.* $R$ is the matrix of $v \mapsto \bar q\,v\,q$ for the unit quaternion $q = a + bi + cj + dk$ acting on pure quaternions, which is an isometry of $\mathbb{R}^3$ with determinant $+1$; the map $S^3 \to SO(3)$ is onto, two to one, and the sign is fixed by $a \ge 0$. $\square$

The inverse, from a rotation to $(b, c, d)$, follows nifti1_io.c: the trace decides which of four formulas is well conditioned, and the sign is fixed by $a \ge 0$. A $3 \times 3$ part that is not exactly a scaled rotation is first brought to the nearest rotation by the polar decomposition, computed by the iteration $P \leftarrow \tfrac12 (P + P^{-T})$ (Higham 1986). The tests recover random quaternions, voxel sizes and $q$ to $10^{-9}$.

### 3.2 NRRD

NRRD (Kindlmann) is a text header, ended by a blank line, before raw, gzipped or ascii data. `space directions` gives for each axis the world step of one sample, `space origin` the centre of the first sample, and `space` the frame; from these the affine is read as in Definition 1. The header's claim of frame is only as good as its writer (§4).

## 4. The Mouse and the Rat

**The Allen Mouse Brain Common Coordinate Framework, v3** (Wang et al. 2020) is the average of 1,675 young adult C57BL/6J mouse brains imaged by serial two-photon tomography at 10 µm, with every voxel labelled by a structure of the Allen ontology. Its native axes run posterior, inferior and right (PIR) from the anterior, superior, left corner of the volume, in micrometres; the volumes are served at 10, 25, 50 and 100 µm. In RAS millimetres,

$$x = z_{\mathrm{ccf}} / 1000, \qquad y = -x_{\mathrm{ccf}} / 1000, \qquad z = -y_{\mathrm{ccf}} / 1000, \tag{2}$$

so that a $25$ µm voxel $(i, j, k)$ is at $(0.025 k, -0.025 i, -0.025 j)$ mm. The framework has no anatomical origin; the midline lies at half the width ($5.7$ mm), and stereotaxic coordinates from bregma are a separate fit.

*Caveat.* The NRRD headers of the Allen files declare `left-posterior-superior`. The documentation of the framework and the Allen Institute's own tools give PIR (Cell Locator: "the orientation header in the .nrrd files used for the CCF are incorrect"), which the catalogue follows.

**Waxholm Space** (Johnson et al. 2010 for the mouse; Papp et al. 2014 and Kleven et al. 2023 for the Sprague Dawley rat) places the origin at the anterior commissure on the midline, with the axes of RAS; the rat template is an ex vivo MRI at 39 µm with 222 structures delineated in version 4.

## 5. Between MNI and Talairach

No exact map joins the atlas brain to an average. Two approximations are in common use, and both are in `stereotaxic.js`.

**Brett's piecewise linear map** (Brett et al. 2001; the MRC CBU imaging wiki) takes an MNI point $(x, y, z)$ to

$$\begin{aligned} z \ge 0: \quad & x' = 0.99\,x, \quad y' = 0.9688\,y + 0.0460\,z, \quad z' = -0.0485\,y + 0.9189\,z, \\ z < 0: \quad & x' = 0.99\,x, \quad y' = 0.9688\,y + 0.0420\,z, \quad z' = -0.0485\,y + 0.8390\,z. \end{aligned} \tag{3}$$

The two branches agree on the plane $z = 0$, so the map is continuous; it shrinks the brain by 1 to 16 per cent and tilts it by about $3°$, the MNI brain being larger and pitched nose-down relative to the atlas.

**Proposition 4.** Brett's map is a bijection of $\mathbb{R}^3$, and its inverse is found by inverting each branch and keeping the candidate whose $z$ has the sign of its branch.

*Proof.* Fix $(x', y', z')$; $x$ is $x'/0.99$. In either branch, $y = (y' - c\,z)/0.9688$ with $c$ the branch's coefficient of $z$ in $y'$, and substituting, $z' = -0.05006\,y' + (0.05006\,c + d)\,z$ with $d$ the coefficient of $z$ in $z'$. As a function of $z$ this is affine with positive slope in each branch ($0.05006 \cdot 0.046 + 0.9189$ and $0.05006 \cdot 0.042 + 0.839$) and takes the same value $-0.05006\,y'$ at $z = 0$: it is continuous and strictly increasing on $\mathbb{R}$, so exactly one $z$ solves it, lying in exactly one branch (or on their common plane, where both candidates coincide). $\square$

**Lancaster's affines** (Lancaster et al. 2007) were fitted in one hundred brains to the bias between MNI coordinates, as SPM2 or FSL produce them with the ICBM-152 template, and Talairach coordinates by landmark-based registration; BrainMap distributes one $4 \times 4$ matrix for each normalisation (`icbm_spm2tal`, `icbm_fsl2tal`, and `icbm_other2tal` for other templates). They are affine, so inverted directly. The MNI origin goes to a Talairach $z$ of 3 to 4 mm by all three, which is the statement on Brett's page that the anterior commissure lies about 4 mm below the MNI origin; the tests check the three against each other in this way.

*Caveat.* Both fits concern the ICBM-152 linear and 6th-generation templates. A point in the 2009c space is in the same frame to about a millimetre, below the accuracy of the maps themselves; the Brain Atlas applies them to 2009c coordinates with that understanding.
