# neuroscience

*Status: draft. Field, height 0.* The brain: the spaces it is placed in, the parcellations that divide it, the maps that join the two, and the head around it. Proposed and built as a domain of [The Science Infrastructures](https://github.com/huangwanhong-maker/The-Science-Infrastructures) in its [ADR 0028](https://github.com/huangwanhong-maker/The-Science-Infrastructures/blob/main/development/decisions/0028-neuroscience-and-the-brain-atlas.md); a repository of its own, attached to the infrastructure as the git submodule `domains/neuroscience`.

The first content is a brain atlas in the sense of the Human Brain Project's multilevel atlas (EBRAINS; Amunts et al. 2020, Dickscheid et al. 2026): reference spaces, parcellations, labelled and statistical maps, and the operations that an atlas viewer needs, for the human, the mouse and the rat. To these it adds the head: landmarks, the scalp as a surface, the electrode positions of the 10-20 system constructed on it, the fitting of a template head to a subject, and the interpolation of scalp data, so that brain-wave recordings can be mapped onto the brain. The Brain Atlas application of the infrastructure draws all of it.

## 1. Concepts

- **A reference space** is a convention of origin, axes and unit, usually defined by a template image. World coordinates in this domain are RAS: x to the right, y to the anterior, z to the superior, in millimetres, as NIfTI has them. A space whose native axes differ (the Allen mouse brain framework runs posterior, inferior, right in micrometres) carries the affine that brings it to RAS.
- **A volume** is a voxel grid with the affine that places it: voxel (i, j, k) is centred at A (i, j, k). The affine, not the storage order, says where a voxel is; the orientation codes of a grid (RAS, LAS, PIR, ...) are read from it.
- **A parcellation** is a rooted forest of regions: the cerebral cortex holds its lobes, a lobe its gyri, a cytoarchitectonic area its two hemispheric parts. The regions form a partial order under containment; a region's down-set is itself and its descendants, and its leaves are the finest regions it contains.
- **A labelled map** gives each voxel the label of one leaf, so that a region's voxels are the union of its leaves' voxels; it may come in fragments, one volume per hemisphere. **A statistical map** gives each region a volume of probabilities; the maximum probability map takes the likeliest region at each voxel.
- **The head** is a star-shaped surface about a centre, with landmarks (nasion, inion, preauricular points, vertex); arcs along it, measured as a tape would, place the electrodes of the 10-20 and 10-10 systems; a similarity or a scaling brings the template head to a subject; spherical splines interpolate values measured at electrodes over the scalp.

## 2. Scope

| Module | Scope | Status |
|---|---|---|
| `affine` | 4 x 4 affines; orientation codes of a grid; LPS and RAS; reorientation of a volume (`js/affine.js`) | draft |
| `volume` | Voxel grids: nearest and trilinear sampling, bounds, resampling, display ranges (`js/volume.js`) | draft |
| `nifti` | NIfTI-1 and NIfTI-2 read and written: the three placement methods, quaternions, scaling, byte order (`js/nifti.js`) | draft |
| `nrrd` | NRRD read and written, raw, gzip and ascii, with the frame of its header (`js/nrrd.js`) | draft |
| `spaces` | The catalogue of reference spaces: Talairach, MNI 305, MNI 152 (linear, 6th generation, 2009c), Colin 27, BigBrain, fsaverage, the Allen CCF v3, Waxholm Space; their template grids (`js/spaces.js`) | draft |
| `stereotaxic` | MNI and Talairach coordinates (Brett 1999; Lancaster et al. 2007); anatomical directions and planes (`js/stereotaxic.js`) | draft |
| `parcellation` | Region trees: labels in fragments, down-sets, ancestors, lowest common ancestors, search, loose matching, hemispheres from names (`js/parcellation.js`) | draft |
| `labels` | Readers: FreeSurfer's lookup table, BIDS segmentation tables, Schaefer's networks, the Allen structure graph, the EBRAINS (siibra) configuration with its maps, ITK-SNAP labels (`js/labels.js`) | draft |
| `anatomy` | Built in: Desikan-Killiany by lobe with FreeSurfer's labels and colours, the subcortical structures of aseg, and the neuraxis (`js/anatomy.js`) | draft |
| `maps` | Labelled and statistical maps: the region at a point, volumes, centroids and bounds, masks, Dice and Jaccard, confusion of two labellings, maximum probability maps, assignment of an uncertain point (`js/maps.js`) | draft |
| `head` | Landmarks and head frames (CTF, Neuromag); ellipsoid and image-cast scalps; the 10-20 and 10-10 systems by arcs; Umeyama's similarity; scaling to measurements; spherical splines; projection onto the brain (`js/head.js`) | draft |
| `atlas` | The catalogue of atlases (human, mouse, rat): spaces, parcellations, sources and licences; the references (`js/atlas.js`) | draft |
| `brain` | The human brain as a tree of 152 structures in the MNI 152 2009c space (cortex by lobe and gyrus, white matter and bundles, basal nuclei, hippocampus and its fields, thalamus and its nuclei, brainstem, cerebellum and its nuclei, ventricles), joined by keys to the infrastructure's anatomy product; colours, short names, and ten functional systems (`js/brain.js`) | draft |
| `knowledge` | What is known of each structure: Latin name (Terminologia Neuroanatomica), summary, location, function, connections, blood supply, development, clinical significance, with references checked against Crossref; 152 entries in five parts by region (`js/knowledge.js`, `js/knowledge/`) | draft |
| `surfaces` | Cortical surfaces (GIfTI, FreeSurfer), surface-based parcellations, geodesics on the cortex | planned |
| `connectivity` | Structural and functional connectivity between regions as networks, and their measures | planned |
| `neurons` | Morphologies (SWC), cable theory, the Hodgkin-Huxley model | planned |
| `signals` | EEG and MEG: forward models on the head, source estimates | planned |

## 3. Conventions

- **Coordinates.** World coordinates are RAS in millimetres. Every volume carries its affine; every point names its space. The Allen framework's native coordinates (posterior, inferior, right; micrometres) are converted by `RAS_FROM_CCF`.
- **Placement of a NIfTI volume.** The sform when its code is set, else the qform, else the voxel sizes alone, as nibabel chooses.
- **Hemispheres.** The side of a region is read from its name in the conventions of the atlases ("- left hemisphere", "Left-", "ctx-lh-", "_LH_", "lh.", "_L"); a region without a side inherits its ancestors'.
- **Labels.** A label is specific to a fragment of a map; `labelKey(label, fragment)` keys it. A region's label set is that of its down-set.
- **Display.** Views follow the neurological convention: the subject's left on the viewer's left. The application states it.
- **MNI and Talairach.** Brett's piecewise map and Lancaster's affines are approximations to about a millimetre; the transforms fit the ICBM-152 templates, and the 2009c space is treated as the same frame.
- **Landmarks.** Landmarks placed by rule on a template (the ends of an ellipsoid's axes, or scalp points in the direction of typical positions) are provisional, and stand in for digitised ones.

## 4. Dependencies

- **Domains:** none. Neuroscience has height 0 in the order of the domains.
- **Foundations:** calx and physis, declared for the C++ to come (numerical methods; rotations and geometry). The provisional JavaScript imports neither.

## 5. Code and Checks

`js/index.js` exports every module of §2. The checks are run by:

```
node domains/neuroscience/tests/run-tests.mjs
```

They compare the readers with the headers of the published templates (TemplateFlow's MNI 152 ICBM 2009c, FSL's 6th generation, MNI 152 linear, Schaefer's map) and with the Allen annotation volume's header; the catalogue of spaces with TemplateFlow's descriptions; the MNI-Talairach transforms with their published coefficients and Brett's statement of the anterior commissure's offset; the readers of the Allen ontology, the EBRAINS configuration of Julich-Brain, FreeSurfer's table and Schaefer's; the built-in parcellations with FreeSurfer's table, label by label; maps on constructed volumes, exactly; and the 10-20 system on a sphere, where every position has a known angle, and on an ellipsoid; the tree of structures, its keys and the side of every key by the centroids of its voxels; and the knowledge base's coverage, inheritance, references and typography. The reference values are in `tests/fixtures/`, each with its source and date. 120 checks.

Reading a file: the readers take bytes, and a gzipped file is inflated by a function the caller passes (Node's `zlib`, the browser's `DecompressionStream`); the domain itself touches no file and no network.

## 6. Notes

- [Reference spaces of the brain](theory/reference-spaces.md)
- [Parcellations and maps](theory/parcellations.md)
- [The head and the 10-20 system](theory/head-and-electrodes.md)

## 7. Data

The atlases are fetched by the infrastructure's data library into its cache and read from there by the application; the domain holds only facts (names, labels, colours, grids, coefficients) and the readers.

| Dataset (manifest) | Content | Licence |
|---|---|---|
| `templateflow-mni152` | MNI 152 ICBM 2009c asymmetric at 1 and 2 mm, brain and head, with the brain mask; FSL's 6th generation at 2 mm | MNI (permissive) |
| `schaefer-2018` | Schaefer's 100 and 400 parcels in 7 networks, in the 2009c space, with their tables | MIT (CBIG) |
| `ebrains-julich-brain` | Julich-Brain v3.1 maximum probability maps, one per hemisphere, with the EBRAINS configuration | EBRAINS terms (non-commercial) |
| `allen-mouse-ccf` | The Allen CCF v3 template and 2017 annotation at 50 and 25 um, with the ontology | Allen Institute terms of use |
| `massp-2` | MASSP 2.0: 31 subcortical structures on each side, from 7 T quantitative MRI (Bazin et al. 2020) | CC BY 4.0 |
| `harvard-oxford` | The Harvard-Oxford cortical atlas, lateralised, at 25 % | FSL licence (non-commercial) |
| `mial-thalamic-nuclei` | Seven thalamic nuclei on each side from diffusion MRI (Najdenovska et al. 2018) | CC BY 4.0 |
| `ebrains-deep-white-matter` | The deep white-matter bundles' maximum probability map (Guevara et al. 2012) | CC BY-NC-SA 4.0 |

## 8. References

- Amunts, K., Mohlberg, H., Bludau, S. and Zilles, K. (2020), Julich-Brain: a 3D probabilistic atlas of the human brain's cytoarchitecture, *Science* 369, 988-992.
- Amunts, K. and Zilles, K. (2015), Architectonic mapping of the human brain beyond Brodmann, *Neuron* 88, 1086-1107.
- Amunts, K. et al. (2013), BigBrain: an ultrahigh-resolution 3D human brain model, *Science* 340, 1472-1475.
- Brett, M., Christoff, K., Cusack, R. and Lancaster, J. (2001), Using the Talairach atlas with the MNI template, *NeuroImage* 13, S85; the mni2tal transform on the MRC CBU imaging wiki.
- Desikan, R. S. et al. (2006), An automated labeling system for subdividing the human cerebral cortex on MRI scans into gyral based regions of interest, *NeuroImage* 31, 968-980.
- Dickscheid, T. et al. (2026), siibra: a software tool suite for realizing a Multilevel Human Brain Atlas from complex data resources, *Nature Methods* 23, 1647-1658.
- Eickhoff, S. B. et al. (2005), A new SPM toolbox for combining probabilistic cytoarchitectonic maps and functional imaging data, *NeuroImage* 25, 1325-1335.
- Evans, A. C., Janke, A. L., Collins, D. L. and Baillet, S. (2012), Brain templates and atlases, *NeuroImage* 62, 911-922.
- Fonov, V. et al. (2011), Unbiased average age-appropriate atlases for pediatric studies, *NeuroImage* 54, 313-327.
- Jasper, H. H. (1958), The ten-twenty electrode system of the International Federation, *Electroencephalogr. Clin. Neurophysiol.* 10, 371-375.
- Kleven, H. et al. (2023), Waxholm Space atlas of the rat brain: a 3D atlas supporting data analysis and integration, *Nature Methods* 20, 1822-1829.
- Lancaster, J. L. et al. (2007), Bias between MNI and Talairach coordinates analyzed using the ICBM-152 brain template, *Hum. Brain Mapp.* 28, 1194-1205.
- Mazziotta, J. et al. (2001), A probabilistic atlas and reference system for the human brain: International Consortium for Brain Mapping (ICBM), *Phil. Trans. R. Soc. Lond. B* 356, 1293-1322.
- Oostenveld, R. and Praamstra, P. (2001), The five percent electrode system for high-resolution EEG and ERP measurements, *Clin. Neurophysiol.* 112, 713-719.
- Papp, E. A., Leergaard, T. B., Calabrese, E., Johnson, G. A. and Bjaalie, J. G. (2014), Waxholm Space atlas of the Sprague Dawley rat brain, *NeuroImage* 97, 374-386.
- Perrin, F., Pernier, J., Bertrand, O. and Echallier, J. F. (1989), Spherical splines for scalp potential and current density mapping, *Electroencephalogr. Clin. Neurophysiol.* 72, 184-187.
- Schaefer, A. et al. (2018), Local-global parcellation of the human cerebral cortex from intrinsic functional connectivity MRI, *Cereb. Cortex* 28, 3095-3114.
- Talairach, J. and Tournoux, P. (1988), *Co-planar Stereotaxic Atlas of the Human Brain*, Thieme.
- Umeyama, S. (1991), Least-squares estimation of transformation parameters between two point patterns, *IEEE Trans. Pattern Anal. Mach. Intell.* 13, 376-380.
- Wang, Q. et al. (2020), The Allen Mouse Brain Common Coordinate Framework: a 3D reference atlas, *Cell* 181, 936-953.
- The NIfTI-1 and NIfTI-2 header definitions (nifti1.h, nifti2.h; NIFTI-Imaging/nifti_clib) and the NRRD format (teem).

The full list, with the keys the code cites, is `CITATIONS` in `js/atlas.js`.

## 9. Used By

The Brain Atlas (`applications/brain-atlas`).

## 10. Open Questions

1. **Nonlinear warps between spaces.** Points move between MNI spaces and to BigBrain only approximately here; displacement fields (ANTs, FSL) would make the warps exact, read from files passed in.
2. **Surfaces.** The cortical sheet, its parcellations (Glasser's HCP-MMP 1.0, Destrieux) and geodesic distances on it belong to a `surfaces` module.
3. **Landmarks of the templates.** The template heads' nasion, inion and preauricular points are placed by rule; digitised positions, or a published set under a compatible licence, should replace them.
4. **The 10-10 positions below the ring** (F9, FT9, TP9, P9 and their fellows at the landmark level) are not constructed yet.
5. **Numerics duplicated.** The Jacobi eigen-solver of `head.js` repeats one in geophysics; both belong in calx.

## 11. Licence

MIT. See [`LICENSE`](LICENSE). The atlases keep their own licences (§7).
