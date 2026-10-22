// Parcellation maps: a parcellation placed in a reference space, as a labelled
// map or as a statistical one.
//
// A labelled map gives every voxel the label of one region (0 for none); it may
// come in several volumes, called fragments, one per hemisphere as Julich-Brain
// has it. A statistical map gives, for each region, a volume of its probability
// at every voxel, from which a labelled map follows by taking at each voxel the
// region of highest probability (the maximum probability map of Eickhoff et al.
// 2005). From a map come the region at a point, the volume, centroid and bounds
// of each region, masks for overlap measures, and the assignment of an
// uncertain point to regions by weighting their probabilities.
//
// World coordinates are RAS in millimetres; centroids are exact under the affine,
// since the mean of the voxel centres maps to the affine image of the mean index.
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { labelKey } from './parcellation.js';
import { worldToVoxel, sampleVoxel, voxelVolume, frameSize } from './volume.js';
import { apply } from './affine.js';

export class LabelledMap {
  // volumes: an array of volumes (or of {volume, fragment}) in one space; the
  // i-th is fragment i, whose labels are keyed by labelKey(label, i).
  constructor({ parcellation, volumes, name = null, space = null }) {
    this.parcellation = parcellation;
    this.name = name;
    this.space = space;
    this.fragments = volumes.map((v, i) => (v.volume ? { volume: v.volume, fragment: v.fragment ?? i, name: v.name || null } : { volume: v, fragment: i, name: null }));
    this._stats = null;
  }

  // The label and region at a world point: the first fragment whose voxel there is not 0.
  at(world) {
    for (const { volume, fragment } of this.fragments) {
      const label = sampleVoxel(volume, worldToVoxel(volume, world), { method: 'nearest', outside: 0 });
      if (label) return { label, fragment, region: this.parcellation.byKey.get(labelKey(label, fragment)) || null };
    }
    return null;
  }

  regionAt(world) { const r = this.at(world); return r ? r.region : null; }

  // The labels present, with their voxel counts, by key.
  counts() {
    const out = new Map();
    for (const { volume, fragment } of this.fragments) {
      const d = volume.data, n = frameSize(volume.dims);
      for (let i = 0; i < n; i++) {
        const v = d[i];
        if (!v) continue;
        const k = labelKey(v, fragment);
        out.set(k, (out.get(k) || 0) + 1);
      }
    }
    return out;
  }

  // For every label key: the number of voxels, the volume (mm^3), the centroid
  // (RAS mm) and the bounds of the voxel centres; computed once.
  labelStatistics() {
    if (this._stats) return this._stats;
    const stats = new Map();
    for (const { volume, fragment } of this.fragments) {
      const [nx, ny, nz] = volume.dims;
      const d = volume.data;
      const vv = voxelVolume(volume);
      const acc = new Map();
      let p = 0;
      for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++, p++) {
        const v = d[p];
        if (!v) continue;
        let a = acc.get(v);
        if (!a) { a = { n: 0, si: 0, sj: 0, sk: 0, min: [i, j, k], max: [i, j, k] }; acc.set(v, a); }
        a.n++; a.si += i; a.sj += j; a.sk += k;
        if (i < a.min[0]) a.min[0] = i; if (j < a.min[1]) a.min[1] = j; if (k < a.min[2]) a.min[2] = k;
        if (i > a.max[0]) a.max[0] = i; if (j > a.max[1]) a.max[1] = j; if (k > a.max[2]) a.max[2] = k;
      }
      for (const [label, a] of acc) {
        const centroid = apply(volume.affine, [a.si / a.n, a.sj / a.n, a.sk / a.n]);
        // The bounds in world coordinates: the corners of the index box, transformed.
        const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (const ci of [a.min[0], a.max[0]]) for (const cj of [a.min[1], a.max[1]]) for (const ck of [a.min[2], a.max[2]]) {
          const w = apply(volume.affine, [ci, cj, ck]);
          for (let x = 0; x < 3; x++) { min[x] = Math.min(min[x], w[x]); max[x] = Math.max(max[x], w[x]); }
        }
        stats.set(labelKey(label, fragment), { voxels: a.n, volume: a.n * vv, centroid, bounds: { min, max }, fragment, label });
      }
    }
    this._stats = stats;
    return stats;
  }

  // The statistics of a region: those of all the labels beneath it, combined.
  statistics(region) {
    const stats = this.labelStatistics();
    let voxels = 0, volume = 0;
    const c = [0, 0, 0];
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const key of region.labelKeys()) {
      const s = stats.get(key);
      if (!s) continue;
      voxels += s.voxels; volume += s.volume;
      for (let x = 0; x < 3; x++) { c[x] += s.centroid[x] * s.voxels; min[x] = Math.min(min[x], s.bounds.min[x]); max[x] = Math.max(max[x], s.bounds.max[x]); }
    }
    if (!voxels) return null;
    return { voxels, volume, centroid: c.map((x) => x / voxels), bounds: { min, max } };
  }

  // A mask of a region on one fragment's grid: 1 where the voxel's label is one of the region's.
  mask(region, fragment = 0) {
    const f = this.fragments[fragment];
    const keys = region.labelKeys();
    const d = f.volume.data, n = frameSize(f.volume.dims);
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (d[i] && keys.has(labelKey(d[i], f.fragment))) out[i] = 1;
    return out;
  }
}

export const labelledMap = (spec) => new LabelledMap(spec);

// ---- overlap ------------------------------------------------------------------------------

// The Dice coefficient 2 |A and B| / (|A| + |B|) and Jaccard index |A and B| / |A or B| of
// two masks on one grid.
export function overlap(a, b) {
  if (a.length !== b.length) throw new Error('masks on different grids');
  let both = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] ? 1 : 0, y = b[i] ? 1 : 0;
    na += x; nb += y; both += x & y;
  }
  return { intersection: both, a: na, b: nb, dice: na + nb ? (2 * both) / (na + nb) : 0, jaccard: na + nb - both ? both / (na + nb - both) : 0 };
}
export const dice = (a, b) => overlap(a, b).dice;
export const jaccard = (a, b) => overlap(a, b).jaccard;

// The confusion of two labelled volumes on one grid: for each label of the
// first, the number of its voxels carrying each label of the second.
export function confusion(volA, volB) {
  if (volA.data.length !== volB.data.length) throw new Error('volumes on different grids');
  const table = new Map();
  for (let i = 0; i < volA.data.length; i++) {
    const a = volA.data[i], b = volB.data[i];
    if (!a && !b) continue;
    let row = table.get(a);
    if (!row) { row = new Map(); table.set(a, row); }
    row.set(b, (row.get(b) || 0) + 1);
  }
  return table;
}

// ---- statistical maps --------------------------------------------------------------------

export class StatisticalMap {
  // maps: [{region, volume}], the volumes of probabilities (0..1, or 0..100 if
  // `percent`) of each region, all in one space.
  constructor({ parcellation, maps, name = null, space = null, percent = false }) {
    this.parcellation = parcellation;
    this.name = name;
    this.space = space;
    this.maps = maps;
    this.scale = percent ? 0.01 : 1;
  }

  // The probability of each region at a world point (trilinear), highest first.
  probabilitiesAt(world) {
    const out = [];
    for (const { region, volume } of this.maps) {
      const v = sampleVoxel(volume, worldToVoxel(volume, world), { method: 'linear', outside: 0 }) * this.scale;
      if (v > 0) out.push({ region, value: v });
    }
    return out.sort((a, b) => b.value - a.value);
  }

  // The assignment of an uncertain point: each region's probability averaged
  // under an isotropic Gaussian of standard deviation sigma (mm) about the
  // point, over the voxels within three sigma; sigma 0 gives the point's values.
  assign(world, { sigma = 0 } = {}) {
    if (!(sigma > 0)) return this.probabilitiesAt(world);
    const out = [];
    for (const { region, volume } of this.maps) {
      const c = worldToVoxel(volume, world);
      const [nx, ny, nz] = volume.dims;
      const spacing = [0, 1, 2].map((a) => Math.hypot(volume.affine[a], volume.affine[4 + a], volume.affine[8 + a]));
      const reach = spacing.map((s) => Math.ceil((3 * sigma) / s));
      let sum = 0, weight = 0;
      for (let k = Math.max(0, Math.floor(c[2] - reach[2])); k <= Math.min(nz - 1, Math.ceil(c[2] + reach[2])); k++) {
        for (let j = Math.max(0, Math.floor(c[1] - reach[1])); j <= Math.min(ny - 1, Math.ceil(c[1] + reach[1])); j++) {
          for (let i = Math.max(0, Math.floor(c[0] - reach[0])); i <= Math.min(nx - 1, Math.ceil(c[0] + reach[0])); i++) {
            const p = apply(volume.affine, [i, j, k]);
            const d2 = (p[0] - world[0]) ** 2 + (p[1] - world[1]) ** 2 + (p[2] - world[2]) ** 2;
            if (d2 > 9 * sigma * sigma) continue;
            const w = Math.exp(-d2 / (2 * sigma * sigma));
            sum += w * volume.data[i + nx * (j + ny * k)] * this.scale;
            weight += w;
          }
        }
      }
      const value = weight ? sum / weight : 0;
      if (value > 0) out.push({ region, value });
    }
    return out.sort((a, b) => b.value - a.value);
  }

  // The maximum probability map: at each voxel the region of highest probability,
  // where that probability reaches `threshold`; as a labelled map whose labels
  // are the regions' own labels, or their order in the list plus one.
  maximumProbabilityMap({ threshold = 0 } = {}) {
    if (!this.maps.length) throw new Error('no maps');
    const first = this.maps[0].volume;
    const n = frameSize(first.dims);
    const labels = this.maps.map(({ region }, i) => region.label ?? i + 1);
    const out = new Uint16Array(n);
    const best = new Float32Array(n);
    this.maps.forEach(({ volume }, m) => {
      if (volume.data.length !== n) throw new Error('the maps are not on one grid');
      const d = volume.data, label = labels[m];
      for (let i = 0; i < n; i++) {
        const v = d[i] * this.scale;
        if (v > best[i] && v >= threshold && v > 0) { best[i] = v; out[i] = label; }
      }
    });
    const volume = { dims: first.dims.slice(0, 3), data: out, affine: first.affine.slice() };
    return { volume, labels: new Map(this.maps.map(({ region }, i) => [labels[i], region])), best };
  }
}

export const statisticalMap = (spec) => new StatisticalMap(spec);
