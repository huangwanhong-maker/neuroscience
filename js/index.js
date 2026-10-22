// The public interface of the neuroscience domain's provisional JavaScript.
// Code outside it imports from this file only.

export * from './affine.js';        // 4 x 4 affines; the orientation of a voxel grid
export * from './volume.js';        // voxel grids: sampling, bounds, resampling, display ranges
export * from './nifti.js';         // NIfTI-1 and -2, read and written
export * from './nrrd.js';          // NRRD, read and written (the Allen Institute's volumes)
export * from './spaces.js';        // reference spaces and their templates
export * from './stereotaxic.js';   // MNI and Talairach coordinates; anatomical directions and planes
export * from './parcellation.js';  // region hierarchies
export * from './labels.js';        // readers of lookup tables and ontologies
export * from './anatomy.js';       // built-in parcellations: Desikan-Killiany with FreeSurfer's structures; the neuraxis
export * from './maps.js';          // labelled and statistical maps: regions at points, statistics, overlap, assignment
export * from './head.js';          // the head: landmarks, frames, the scalp, the 10-20 system, fitting, scalp maps
export * from './atlas.js';         // the catalogue of atlases and their sources
export * from './brain.js';        // the human brain as a tree of structures, joined to the anatomy product
export * from './knowledge.js';    // what is known of each structure
