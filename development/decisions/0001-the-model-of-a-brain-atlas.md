# 0001. The Model of a Brain Atlas

- **Status:** Accepted
- **Date:** 2026-10-22
- **Decided by:** the user asked for a neuroscience domain with a brain atlas of the kind the Human Brain Project built, and then for a system that visualises the brain, maps data onto it, and can be set to a head's size and shape, for brain-wave data among others. Claude chose the model below and wrote this record.

## 1. Context

The EBRAINS multilevel human brain atlas (Amunts et al. 2020; Dickscheid et al. 2026) is organised as atlases of a species, reference spaces with templates, parcellations whose regions form a tree, parcellation maps that are labelled or statistical, data features anchored to regions, and locations (points, point sets, boxes) assigned to regions. Its client fetches everything from a knowledge graph and web services.

A domain of the infrastructure is pure: it fetches nothing and draws nothing. What it can hold is the model and the computation.

## 2. Decision

1. **The objects** are reference spaces (with their template grids), volumes (with their voxel-to-world affines), parcellations (forests of regions with labels keyed by fragment), labelled and statistical maps, and the head (landmarks, scalp, electrodes). Their vocabulary follows the EBRAINS atlas where the concepts coincide, so that its configurations can be read directly (`labels.js`).
2. **World coordinates are RAS in millimetres,** the NIfTI convention. A space with other native axes carries the affine to RAS; the Allen framework's PIR micrometres are the first case.
3. **Readers take bytes.** NIfTI and NRRD are parsed from memory; a gzipped file is inflated by a function the caller passes. The data library fetches the files; the application hands over the bytes. The domain therefore runs unchanged in Node and in the browser.
4. **Facts are transcribed and checked.** Grids, coefficients, labels and colours that are not computed are written into the code with their sources, and the tests compare them with fixtures taken from those sources on a stated date.
5. **The head is geometry on a star-shaped surface,** with the 10–20 system constructed by arcs so that any scalp, measured or templated, carries the electrodes; template landmarks are provisional.
6. **Provisional JavaScript,** as for the other domains, until the C++ of the infrastructure exists; the C++ must pass the same checks.

## 3. Alternatives Considered

- **A client of the EBRAINS services,** as siibra is. It would have made the domain impure and dependent on a service, and would not have served the mouse and the rat from their own sources.
- **Reading files by path inside the domain.** The infrastructure forbids it for domains, and the browser cannot do it; bytes are the common currency.
- **Published electrode positions in MNI space** (the templates of FieldTrip, EEGLAB). Their licences were not established, and positions on a template head do not scale to a subject; the construction by arcs does, and reduces to the published definitions on a sphere.

## 4. Consequences

- Twelve modules, 89 checks, three notes; the Brain Atlas application draws the result.
- The catalogue of atlases and spaces is a set of facts to be kept with their sources as versions advance (Julich-Brain, the Allen annotation).
- Numerics written here provisionally (a Jacobi eigen-solver, trilinear interpolation, a polar decomposition) are to move to the foundations.
