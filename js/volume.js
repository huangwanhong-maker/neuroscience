// Voxel grids: a scalar (or label) at each node of a regular grid, with the
// affine that places the grid in the world.
//
// A volume is {dims, data, affine, ...}: dims the number of voxels along each
// axis (three, or more for a series), data a typed array in Fortran order (the
// first index fastest, as NIfTI and NRRD store it), and affine the voxel-to-world
// map of affine.js. Voxel (i, j, k) is data[i + dims[0] (j + dims[1] k)], and
// its centre is at affine (i, j, k). World coordinates are RAS, in millimetres.
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { apply, invert, voxelSizes, determinant3 } from './affine.js';

export function volume({ dims, data, affine, ...rest }) {
  if (!dims || dims.length < 3) throw new Error('a volume has at least three dimensions');
  const n = dims.reduce((p, d) => p * d, 1);
  if (!data || data.length !== n) throw new Error(`the data has ${data ? data.length : 0} values, not ${n}`);
  if (!affine || affine.length !== 16) throw new Error('a volume needs its 4 x 4 affine');
  return { dims: dims.slice(), data, affine: affine.slice(), ...rest };
}

export const indexOf = (dims, i, j, k) => i + dims[0] * (j + dims[1] * k);
export const frameSize = (dims) => dims[0] * dims[1] * dims[2];

export const voxelAt = (vol, i, j, k, frame = 0) => vol.data[frame * frameSize(vol.dims) + indexOf(vol.dims, i, j, k)];

// The inverse affine, kept with the volume once computed.
const inverses = new WeakMap();
export function inverseAffine(vol) {
  let inv = inverses.get(vol);
  if (!inv) { inv = invert(vol.affine); inverses.set(vol, inv); }
  return inv;
}

// The continuous voxel coordinates of a world point.
export const worldToVoxel = (vol, p) => apply(inverseAffine(vol), p);
export const voxelToWorld = (vol, ijk) => apply(vol.affine, ijk);

// The value at continuous voxel coordinates: that of the nearest voxel, or
// interpolated trilinearly between the eight around it. Outside the grid the
// value is `outside` (nearest), or the interpolation treats missing voxels as
// `outside` (linear). The nearest voxel is found by rounding, so that the
// grid's cells are the half-open intervals [i - 1/2, i + 1/2).
export function sampleVoxel(vol, [u, v, w], { method = 'nearest', outside = NaN, frame = 0 } = {}) {
  const [nx, ny, nz] = vol.dims;
  const base = frame * nx * ny * nz;
  const d = vol.data;
  if (method === 'nearest') {
    const i = Math.round(u), j = Math.round(v), k = Math.round(w);
    if (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) return outside;
    return d[base + i + nx * (j + ny * k)];
  }
  if (method !== 'linear') throw new Error(`unknown interpolation ${method}`);
  const i0 = Math.floor(u), j0 = Math.floor(v), k0 = Math.floor(w);
  const fu = u - i0, fv = v - j0, fw = w - k0;
  let sum = 0;
  for (let dk = 0; dk <= 1; dk++) {
    const k = k0 + dk, wk = dk ? fw : 1 - fw;
    if (wk === 0) continue;
    for (let dj = 0; dj <= 1; dj++) {
      const j = j0 + dj, wj = dj ? fv : 1 - fv;
      if (wj === 0) continue;
      for (let di = 0; di <= 1; di++) {
        const i = i0 + di, wi = di ? fu : 1 - fu;
        if (wi === 0) continue;
        const inside = i >= 0 && j >= 0 && k >= 0 && i < nx && j < ny && k < nz;
        const value = inside ? d[base + i + nx * (j + ny * k)] : outside;
        sum += wi * wj * wk * value;
      }
    }
  }
  return sum;
}

export const sample = (vol, world, options) => sampleVoxel(vol, worldToVoxel(vol, world), options);

// The box of world coordinates the grid covers: the voxel centres extended by
// half a voxel on every side, as a {min, max} pair.
export function worldBounds(vol) {
  const [nx, ny, nz] = vol.dims;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const i of [-0.5, nx - 0.5]) for (const j of [-0.5, ny - 0.5]) for (const k of [-0.5, nz - 0.5]) {
    const p = apply(vol.affine, [i, j, k]);
    for (let a = 0; a < 3; a++) { min[a] = Math.min(min[a], p[a]); max[a] = Math.max(max[a], p[a]); }
  }
  return { min, max };
}

// The volume of one voxel, in cubic millimetres.
export const voxelVolume = (vol) => Math.abs(determinant3(vol.affine));

// The volume sampled on another grid {dims, affine}: each new voxel takes the
// value at its centre, by the nearest voxel (right for labels) or trilinearly
// (right for intensities and probabilities).
export function resample(vol, { dims, affine }, { method = 'nearest', outside = 0, type } = {}) {
  const Ctor = type || vol.data.constructor;
  const [nx, ny, nz] = dims;
  const out = new Ctor(nx * ny * nz);
  const inv = inverseAffine(vol);
  const options = { method, outside };
  let p = 0;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const w = apply(affine, [i, j, k]);
    const v = sampleVoxel(vol, apply(inv, w), options);
    out[p++] = Number.isNaN(v) ? outside : v;
  }
  return { ...vol, dims: [nx, ny, nz], data: out, affine: affine.slice() };
}

// A mask (1 where low <= value <= high, else 0) as bytes.
export function threshold(vol, low, high = Infinity) {
  const d = vol.data, out = new Uint8Array(d.length);
  for (let i = 0; i < d.length; i++) out[i] = d[i] >= low && d[i] <= high ? 1 : 0;
  return out;
}

export function minMax(data) {
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return [lo, hi];
}

// A range that leaves out the extremes: the values at two quantiles of the
// non-zero voxels, from a histogram of 4096 bins.
export function robustRange(data, lowQuantile = 0.01, highQuantile = 0.99) {
  const [lo, hi] = minMax(data);
  if (!(hi > lo)) return [lo, hi];
  const bins = new Uint32Array(4096);
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v === 0) continue;
    bins[Math.min(4095, Math.floor(((v - lo) / (hi - lo)) * 4095))]++;
    count++;
  }
  if (!count) return [lo, hi];
  const at = (q) => {
    let seen = 0;
    for (let b = 0; b < 4096; b++) {
      seen += bins[b];
      if (seen >= q * count) return lo + ((b + 0.5) / 4096) * (hi - lo);
    }
    return hi;
  };
  return [at(lowQuantile), at(highQuantile)];
}

// Values rescaled linearly from [low, high] to 0..255, for display.
export function toUint8(data, [low, high]) {
  const out = new Uint8Array(data.length);
  const s = high > low ? 255 / (high - low) : 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - low) * s;
    out[i] = v <= 0 ? 0 : v >= 255 ? 255 : Math.round(v);
  }
  return out;
}

// The voxel sizes of a volume, in millimetres.
export const spacingOf = (vol) => voxelSizes(vol.affine);

// A volume smoothed by a Gaussian of the given full width at half maximum (mm), whose
// standard deviation is fwhm / sqrt(8 ln 2), applied along the three axes in turn and
// cut off at 3 standard deviations (Friston et al. 2007, ch. 2, on spatial smoothing).
// The support is the voxels that are finite and not 0 (a statistic is 0 outside its
// mask); voxels outside it stay 0. At the support's edge, `edge` chooses: 'zero' counts the
// outside as 0, as plain convolution does (SPM's smoothing), which pulls the edge towards 0
// and is the cautious choice for a statistic, whose edge voxels would otherwise keep more
// of their noise; 'average' takes the Gaussian average over the support alone (normalised
// convolution, Knutsson and Westin 1993), which keeps a constant constant to the edge.
// One frame; Float32 out.
export function smooth(vol, fwhm, { frame = 0, edge = 'average' } = {}) {
  const dims = vol.dims.slice(0, 3), [nx, ny] = dims, n = frameSize(dims), base = frame * n;
  const inside = new Uint8Array(n);
  let x = new Float64Array(n), w = new Float64Array(n);
  for (let s = 0; s < n; s++) {
    const v = vol.data[base + s];
    if (Number.isFinite(v) && v !== 0) { inside[s] = 1; x[s] = v; w[s] = 1; }
  }
  const spacing = voxelSizes(vol.affine), strides = [1, nx, nx * ny];
  if (fwhm > 0) for (let a = 0; a < 3; a++) {
    const sigma = fwhm / Math.sqrt(8 * Math.LN2) / spacing[a], R = Math.ceil(3 * sigma);
    if (R < 1) continue;
    const k = Float64Array.from({ length: 2 * R + 1 }, (_, i) => Math.exp(-0.5 * ((i - R) / sigma) ** 2));
    const L = dims[a], st = strides[a], X = new Float64Array(n), W = new Float64Array(n);
    for (let s = 0; s < n; s++) {
      const p = Math.floor(s / st) % L, lo = Math.max(-R, -p), hi = Math.min(R, L - 1 - p);
      let sx = 0, sw = 0;
      for (let i = lo; i <= hi; i++) { const t = s + i * st, g = k[i + R]; sx += g * x[t]; sw += g * w[t]; }
      X[s] = sx; W[s] = sw;
    }
    x = X; w = W;
  }
  const out = new Float32Array(n);
  // Under 'zero' the weight divides out only the kernel's truncation at the grid's border.
  let full = 1;
  if (edge === 'zero') for (let a = 0; a < 3; a++) {
    const sigma = fwhm / Math.sqrt(8 * Math.LN2) / spacing[a], R = Math.ceil(3 * sigma);
    if (fwhm > 0 && R >= 1) { let t = 0; for (let i = -R; i <= R; i++) t += Math.exp(-0.5 * (i / sigma) ** 2); full *= t; }
  }
  for (let s = 0; s < n; s++) out[s] = inside[s] && w[s] > 1e-12 ? x[s] / (edge === 'zero' ? full : w[s]) : 0;
  return { ...vol, dims, data: out, affine: vol.affine.slice() };
}
