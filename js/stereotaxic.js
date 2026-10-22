// Between MNI and Talairach coordinates.
//
// Coordinates in the literature are given in one of two frames that share their
// axes but not their brains. Talairach space is that of the printed atlas of
// one brain (Talairach and Tournoux 1988), with the origin at the anterior
// commissure (AC) and the y axis along the AC-PC line. MNI space is defined by
// an average of many brains (spaces.js); it is larger, and its origin lies about
// 4 mm above the AC (Brett). No exact map joins them, since the atlas brain
// is one individual, but two approximations are in common use:
//
//   Brett (1999): a piecewise linear map, one matrix above the AC plane and one
//   below, published on the MRC CBU imaging wiki (Brett et al. 2001), eqs. (1)-(2)
//   here;
//
//   Lancaster et al. (2007): one affine per normalisation software, fitted to
//   100 brains registered by SPM2 or FSL to the ICBM-152 template, and a third
//   for other templates, as distributed by BrainMap (icbm_spm2tal.m,
//   icbm_fsl2tal.m, icbm_other2tal.m, dated 2007-03-14, retrieved 2026-10-22).
//
// Both are applied to points, and inverted; the inverse of Brett's map chooses
// the branch consistent with the sign of the MNI z, where the two branches agree.
//
// Caveat. These fit the ICBM-152 linear and 6th-generation templates. Points in
// the 2009c nonlinear space are not exactly in the same frame; the differences
// are of the order of a millimetre, below the accuracy of the maps themselves.
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { fromRows, invert, apply } from './affine.js';

// Brett's mni2tal: X' = 0.99 X; above the AC (Z >= 0): Y' = 0.9688 Y + 0.0460 Z,
// Z' = -0.0485 Y + 0.9189 Z; below (Z < 0): Y' = 0.9688 Y + 0.0420 Z,
// Z' = -0.0485 Y + 0.8390 Z.
export const BRETT_ABOVE = fromRows([[0.99, 0, 0, 0], [0, 0.9688, 0.046, 0], [0, -0.0485, 0.9189, 0]]);   // (1)
export const BRETT_BELOW = fromRows([[0.99, 0, 0, 0], [0, 0.9688, 0.042, 0], [0, -0.0485, 0.839, 0]]);    // (2)

// Lancaster's icbm2tal, by the software that normalised to ICBM-152.
export const LANCASTER = {
  spm: fromRows([[0.9254, 0.0024, -0.0118, -1.0207], [-0.0048, 0.9316, -0.0871, -1.7667], [0.0152, 0.0883, 0.8924, 4.0926]]),
  fsl: fromRows([[0.9464, 0.0034, -0.0026, -1.068], [-0.0083, 0.9479, -0.058, -1.0239], [0.0053, 0.0617, 0.901, 3.1883]]),
  other: fromRows([[0.9357, 0.0029, -0.0072, -1.0423], [-0.0065, 0.9396, -0.0726, -1.394], [0.0103, 0.0752, 0.8967, 3.6475]]),
};
const LANCASTER_INVERSE = Object.fromEntries(Object.entries(LANCASTER).map(([k, m]) => [k, invert(m)]));
const BRETT_ABOVE_INVERSE = invert(BRETT_ABOVE), BRETT_BELOW_INVERSE = invert(BRETT_BELOW);

// A Talairach point from an MNI point. method: 'brett' (default) or 'lancaster';
// software, for Lancaster: 'spm', 'fsl' or 'other' (default).
export function mniToTalairach(p, { method = 'brett', software = 'other' } = {}) {
  if (method === 'brett') return apply(p[2] >= 0 ? BRETT_ABOVE : BRETT_BELOW, p);
  if (method === 'lancaster') {
    const m = LANCASTER[software];
    if (!m) throw new Error(`unknown normalisation software ${software}`);
    return apply(m, p);
  }
  throw new Error(`unknown method ${method}`);
}

// An MNI point from a Talairach point: the inverse of the above.
export function talairachToMni(p, { method = 'brett', software = 'other' } = {}) {
  if (method === 'brett') {
    // Both branches map z = 0 to z' = 0 and are increasing in z, so exactly one
    // candidate is consistent with its branch (both are, on the plane z = 0).
    const above = apply(BRETT_ABOVE_INVERSE, p);
    if (above[2] >= 0) return above;
    return apply(BRETT_BELOW_INVERSE, p);
  }
  if (method === 'lancaster') {
    const m = LANCASTER_INVERSE[software];
    if (!m) throw new Error(`unknown normalisation software ${software}`);
    return apply(m, p);
  }
  throw new Error(`unknown method ${method}`);
}

// The anatomical directions of the human brain, as the letters of the RAS
// frame and their synonyms. Above the midbrain the brain's own axis is bent
// forward, so that dorsal means superior and rostral means anterior; in the
// brain stem and the spinal cord, and in rodents, dorsal is posterior to the
// axis and rostral is toward the head.
export const DIRECTIONS = {
  R: { name: 'right', axis: 0, sign: 1 }, L: { name: 'left', axis: 0, sign: -1 },
  A: { name: 'anterior', axis: 1, sign: 1, synonyms: ['rostral', 'frontal', 'ventral (brain stem)'] },
  P: { name: 'posterior', axis: 1, sign: -1, synonyms: ['caudal', 'occipital', 'dorsal (brain stem)'] },
  S: { name: 'superior', axis: 2, sign: 1, synonyms: ['dorsal (cerebrum)', 'cranial'] },
  I: { name: 'inferior', axis: 2, sign: -1, synonyms: ['ventral (cerebrum)', 'caudal (brain stem)'] },
};

// The three anatomical planes, each by the axis it is normal to.
export const PLANES = {
  sagittal: { axis: 0, name: 'sagittal', description: 'the plane dividing left from right; the midsagittal plane is the midline' },
  coronal: { axis: 1, name: 'coronal', description: 'the plane dividing anterior from posterior (frontal plane)' },
  axial: { axis: 2, name: 'axial', description: 'the plane dividing superior from inferior (transverse or horizontal plane)' },
};
