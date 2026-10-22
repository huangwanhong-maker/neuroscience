// Affine transformations of three-dimensional space, as 4 x 4 matrices, and the
// orientation of a voxel grid with respect to the anatomical axes.
//
// A volume's affine A sends voxel indices (i, j, k), as homogeneous coordinates
// (i, j, k, 1), to the world coordinates (x, y, z) of the centre of that voxel.
// Throughout the domain, world coordinates are RAS: x grows to the subject's
// right, y to the anterior, z to the superior, in millimetres (the NIfTI-1
// convention; nifti1.h, "ORIENTATION AND LOCATION IN SPACE"). A matrix is stored
// row-major as 16 numbers, m[4 r + c].
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

export const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

// A matrix from its three or four rows.
export function fromRows(rows) {
  const m = identity();
  rows.forEach((row, r) => row.forEach((v, c) => { m[4 * r + c] = v; }));
  return m;
}

export const rows = (m) => [0, 1, 2, 3].map((r) => m.slice(4 * r, 4 * r + 4));

// A diagonal affine: voxel (i, j, k) at origin + (i s_x, j s_y, k s_z). The
// origin is the world position of the centre of voxel (0, 0, 0).
export function fromOriginSpacing(origin, spacing) {
  const [sx, sy, sz] = typeof spacing === 'number' ? [spacing, spacing, spacing] : spacing;
  return fromRows([[sx, 0, 0, origin[0]], [0, sy, 0, origin[1]], [0, 0, sz, origin[2]]]);
}

export const translation = (t) => fromRows([[1, 0, 0, t[0]], [0, 1, 0, t[1]], [0, 0, 1, t[2]]]);
export const scaling = (s) => fromRows([[s[0], 0, 0, 0], [0, s[1], 0, 0], [0, 0, s[2], 0]]);

// The product A B: apply B first, then A.
export function compose(A, B) {
  const m = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
    let s = 0;
    for (let k = 0; k < 4; k++) s += A[4 * r + k] * B[4 * k + c];
    m[4 * r + c] = s;
  }
  return m;
}

export const determinant3 = (m) => m[0] * (m[5] * m[10] - m[6] * m[9]) - m[1] * (m[4] * m[10] - m[6] * m[8]) + m[2] * (m[4] * m[9] - m[5] * m[8]);

// The inverse of an affine whose last row is (0, 0, 0, 1): the 3 x 3 part is
// inverted by cofactors, and the translation follows.
export function invert(A) {
  const det = determinant3(A);
  if (!Number.isFinite(det) || det === 0) throw new Error('the affine is singular');
  const [a, b, c, , d, e, f, , g, h, i] = A;
  const R = [
    (e * i - f * h) / det, (c * h - b * i) / det, (b * f - c * e) / det,
    (f * g - d * i) / det, (a * i - c * g) / det, (c * d - a * f) / det,
    (d * h - e * g) / det, (b * g - a * h) / det, (a * e - b * d) / det,
  ];
  const t = [A[3], A[7], A[11]];
  const m = identity();
  for (let r = 0; r < 3; r++) {
    m[4 * r] = R[3 * r]; m[4 * r + 1] = R[3 * r + 1]; m[4 * r + 2] = R[3 * r + 2];
    m[4 * r + 3] = -(R[3 * r] * t[0] + R[3 * r + 1] * t[1] + R[3 * r + 2] * t[2]);
  }
  return m;
}

// The image of a point.
export function apply(A, p) {
  const [x, y, z] = p;
  return [
    A[0] * x + A[1] * y + A[2] * z + A[3],
    A[4] * x + A[5] * y + A[6] * z + A[7],
    A[8] * x + A[9] * y + A[10] * z + A[11],
  ];
}

// The image of a direction (no translation).
export const applyVector = (A, v) => [
  A[0] * v[0] + A[1] * v[1] + A[2] * v[2],
  A[4] * v[0] + A[5] * v[1] + A[6] * v[2],
  A[8] * v[0] + A[9] * v[1] + A[10] * v[2],
];

// The voxel sizes: the lengths of the columns of the 3 x 3 part.
export const voxelSizes = (A) => [0, 1, 2].map((c) => Math.hypot(A[c], A[4 + c], A[8 + c]));

export const nearlyEqual = (A, B, tol = 1e-9) => A.every((v, i) => Math.abs(v - B[i]) <= tol);

// ---- orientation -------------------------------------------------------------------------

const WORLD_AXES = [['L', 'R'], ['P', 'A'], ['I', 'S']];

// The anatomical direction in which each voxel axis increases, as one letter
// per axis: for the i axis, 'R' when x grows with i, 'L' when it falls, and so on.
// Each voxel axis is matched to the world axis along which it has the largest
// component, the strongest matches first, so that each world axis is used once
// (as nibabel's aff2axcodes does for affines that are nearly axis-aligned).
export function axisCodes(A) {
  const { permutation, flips } = orientationOf(A);
  return permutation.map((w, v) => WORLD_AXES[w][flips[v] ? 0 : 1]);
}

// For each voxel axis v: the world axis permutation[v] it mostly runs along, and
// whether it runs against that axis (flips[v]).
export function orientationOf(A) {
  const cols = [0, 1, 2].map((c) => {
    const v = [A[c], A[4 + c], A[8 + c]];
    const n = Math.hypot(...v) || 1;
    return v.map((x) => x / n);
  });
  const permutation = [-1, -1, -1], flips = [false, false, false];
  const used = new Set();
  const candidates = [];
  for (let v = 0; v < 3; v++) for (let w = 0; w < 3; w++) candidates.push([Math.abs(cols[v][w]), v, w]);
  candidates.sort((p, q) => q[0] - p[0]);
  for (const [, v, w] of candidates) {
    if (permutation[v] >= 0 || used.has(w)) continue;
    permutation[v] = w;
    flips[v] = cols[v][w] < 0;
    used.add(w);
  }
  return { permutation, flips };
}

// The world frame itself may be named by a code. RAS is the frame of the domain;
// LPS is that of DICOM and ITK (x to the left, y to the posterior).
export const RAS_FROM_LPS = fromRows([[-1, 0, 0, 0], [0, -1, 0, 0], [0, 0, 1, 0]]);
export const LPS_FROM_RAS = RAS_FROM_LPS;

// The voxel-to-world affine of a volume whose world frame is `code` (such as
// 'LPS'), rewritten for RAS. Only the world frame changes; the voxels do not.
export function toRAS(affine, code) {
  if (code === 'RAS') return affine.slice();
  const signs = [...code].map((c, i) => (c === WORLD_AXES[i][1] ? 1 : c === WORLD_AXES[i][0] ? -1 : NaN));
  if (code.length !== 3 || signs.some(Number.isNaN)) throw new Error(`unknown orientation code ${code}`);
  return compose(fromRows([[signs[0], 0, 0, 0], [0, signs[1], 0, 0], [0, 0, signs[2], 0]]), affine);
}

// A volume's data re-ordered so that its voxel axes run along the world axes
// named by `codes` (by default 'RAS': i to the right, j anterior, k superior).
// The voxels keep their world positions, so the new affine is the old one
// composed with the index transformation. The volume is {dims, data, affine}
// with data in Fortran order (i fastest), as NIfTI stores it; dimensions
// beyond the third, such as time, are kept as they are.
export function reorient(volume, codes = 'RAS') {
  const target = [...codes];
  const { permutation, flips } = orientationOf(volume.affine);
  // For each new axis: the old axis it takes, and whether that axis is reversed.
  const take = target.map((letter) => {
    const w = WORLD_AXES.findIndex((pair) => pair.includes(letter));
    if (w < 0) throw new Error(`unknown orientation code ${codes}`);
    const old = permutation.indexOf(w);
    const wantPositive = letter === WORLD_AXES[w][1];
    return { old, reverse: flips[old] === wantPositive };
  });
  const dims = volume.dims.slice(0, 3);
  const newDims = take.map(({ old }) => dims[old]);
  const extra = volume.dims.slice(3);
  const frames = extra.reduce((p, n) => p * n, 1);
  const n = dims[0] * dims[1] * dims[2];
  const out = new volume.data.constructor(volume.data.length);
  const stride = [1, dims[0], dims[0] * dims[1]];
  for (let f = 0; f < frames; f++) {
    const base = f * n;
    let p = 0;
    for (let c = 0; c < newDims[2]; c++) {
      const kc = take[2].reverse ? dims[take[2].old] - 1 - c : c;
      for (let b = 0; b < newDims[1]; b++) {
        const kb = take[1].reverse ? dims[take[1].old] - 1 - b : b;
        const offset = base + kc * stride[take[2].old] + kb * stride[take[1].old];
        const s = stride[take[0].old];
        if (take[0].reverse) {
          for (let a = 0, i = dims[take[0].old] - 1; a < newDims[0]; a++, i--) out[base + p++] = volume.data[offset + i * s];
        } else {
          for (let a = 0; a < newDims[0]; a++) out[base + p++] = volume.data[offset + a * s];
        }
      }
    }
  }
  // The index map M: new indices (a, b, c) to old indices, old = a or dims - 1 - a along each axis.
  const M = identity();
  for (let r = 0; r < 3; r++) M[4 * r + r] = 0;
  take.forEach(({ old, reverse }, nAxis) => {
    M[4 * old + nAxis] = reverse ? -1 : 1;
    M[4 * old + 3] = reverse ? dims[old] - 1 : 0;
  });
  return { ...volume, dims: [...newDims, ...extra], data: out, affine: compose(volume.affine, M) };
}
