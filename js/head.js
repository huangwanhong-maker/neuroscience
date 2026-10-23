// The head: its landmarks, the coordinate systems built on them, the scalp as a
// surface, the electrode positions of the 10-20 system constructed on it, the
// fitting of a template head to a subject, and the interpolation of values
// measured at electrodes over the scalp.
//
// Everything here is geometry on a star-shaped surface: a scalp is given by a
// centre, a frame (x to the right, y to the nasion, z to the vertex) and a
// radius in every direction, analytic for an ellipsoid or cast through a head
// mask. Arcs are measured along the surface, as a tape would measure them, in
// sections through the centre; the ring that carries the temporal and occipital
// electrodes is the curve at one tenth of the way up every meridian.
//
// Sources: Jasper (1958), the 10-20 system; Oostenveld and Praamstra (2001),
// the 10-10 and 10-5 extensions and the construction by arcs; Perrin, Pernier,
// Bertrand and Echallier (1989), spherical splines; Umeyama (1991), the
// least-squares similarity between point sets; the FieldTrip documentation of
// the CTF and Neuromag head coordinate systems.
//
// Caveat. Landmarks placed by rule on a template, as the ellipsoid's axis ends
// are, stand in for digitised ones; the positions that follow are those of a
// standard head, not of a person.
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { fromRows, invert, apply, compose, translation } from './affine.js';
import { worldToVoxel, sampleVoxel } from './volume.js';

const DEG = Math.PI / 180;
const norm = (v) => Math.hypot(v[0], v[1], v[2]);
const unit = (v) => { const n = norm(v) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ---- head coordinate systems -------------------------------------------------------------

// The affine from the world frame of the landmarks to a head frame, and back.
// CTF (also 4D/BTi): origin midway between the preauricular points; x through
// the nasion; y to the left, in the plane of the three; z up. Neuromag (Elekta):
// x from the left to the right preauricular point; y toward the nasion,
// orthogonal to x; z up; origin where the perpendicular from the nasion meets
// the line of the ears (FieldTrip, "How are the different head and MRI
// coordinate systems defined?").
export function headFrame({ nasion, lpa, rpa }, convention = 'ctf') {
  let origin, ex, ey, ez;
  if (convention === 'ctf') {
    origin = scale(add(lpa, rpa), 0.5);
    ex = unit(sub(nasion, origin));
    ez = unit(cross(ex, sub(lpa, origin)));     // x toward the nose, y toward the left: z = x cross y is up
    ey = cross(ez, ex);
  } else if (convention === 'neuromag') {
    ex = unit(sub(rpa, lpa));
    const t = dot(sub(nasion, lpa), ex);
    origin = add(lpa, scale(ex, t));
    ey = unit(sub(nasion, origin));
    ez = cross(ex, ey);
  } else {
    throw new Error(`unknown head coordinate convention ${convention}`);
  }
  // head = R (world - origin), with the rows of R the axes.
  const R = fromRows([[...ex, 0], [...ey, 0], [...ez, 0]]);
  const toHead = compose(R, translation(scale(origin, -1)));
  return { convention, origin, axes: [ex, ey, ez], toHead, toWorld: invert(toHead) };
}

// ---- the scalp as a surface -------------------------------------------------------------

// A direction in the head frame from the polar angle theta (from the vertex
// axis) and the azimuth phi (from the right, toward the nasion at 90 degrees).
const direction = (theta, phi) => [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];

export class Scalp {
  // centre and axes in world coordinates; radius(d) the distance from the centre
  // to the surface along the unit direction d given in the head frame.
  constructor({ centre, axes, radius, name = 'scalp' }) {
    this.centre = centre;
    this.axes = axes.map(unit);
    this.radius = radius;
    this.name = name;
  }

  toWorld(local) { return add(this.centre, add(add(scale(this.axes[0], local[0]), scale(this.axes[1], local[1])), scale(this.axes[2], local[2]))); }
  toLocal(world) { const d = sub(world, this.centre); return [dot(d, this.axes[0]), dot(d, this.axes[1]), dot(d, this.axes[2])]; }

  // The surface point in a local direction, and at polar angle theta and azimuth phi.
  pointAlong(d) { const u = unit(d); return this.toWorld(scale(u, this.radius(u))); }
  point(theta, phi) { return this.pointAlong(direction(theta, phi)); }
  // The polar angle and azimuth of a world point, seen from the centre.
  angles(world) {
    const [x, y, z] = unit(this.toLocal(world));
    return { theta: Math.acos(Math.max(-1, Math.min(1, z))), phi: Math.atan2(y, x) };
  }

  // The curve along the surface from p to q in the section through the centre:
  // n + 1 points, by turning the direction from that of p to that of q in their
  // plane. Of the two arcs of that plane, the shorter is taken unless `via`
  // names a direction the arc should pass near, as the vertex for the arc from
  // the nasion to the inion on a real head, where both landmarks lie below the
  // centre and the shorter arc would pass under the chin. When p and q are
  // opposite, the plane itself is fixed by `via` (the vertex by default).
  section(p, q, n = 200, via = null) {
    const a = unit(this.toLocal(p)), b = unit(this.toLocal(q));
    const omega = Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
    const points = [];
    if (omega < 1e-9) { for (let i = 0; i <= n; i++) points.push(this.pointAlong(a)); return points; }
    const up = unit(via || [0, 0, 1]);
    let axis = omega > Math.PI - 1e-6 ? unit(cross(a, up)) : unit(cross(a, b));
    let angle = omega;
    if (via && omega <= Math.PI - 1e-6) {
      // The midpoints of the two arcs; the one nearer `via` wins.
      const e = cross(axis, a);
      const mShort = add(scale(a, Math.cos(omega / 2)), scale(e, Math.sin(omega / 2)));
      const long = 2 * Math.PI - omega;
      const mLong = add(scale(a, Math.cos(long / 2)), scale(e, -Math.sin(long / 2)));
      if (dot(mLong, up) > dot(mShort, up)) { axis = scale(axis, -1); angle = long; }
    }
    const e2 = cross(axis, a);                   // in the plane, perpendicular to a
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * angle;
      points.push(this.pointAlong(add(scale(a, Math.cos(t)), scale(e2, Math.sin(t)))));
    }
    return points;
  }

  // The point at a fraction of the arc length of a curve.
  static along(points, fraction) {
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + norm(sub(points[i], points[i - 1])));
    const target = fraction * lengths[lengths.length - 1];
    for (let i = 1; i < points.length; i++) {
      if (lengths[i] >= target) {
        const t = lengths[i] === lengths[i - 1] ? 0 : (target - lengths[i - 1]) / (lengths[i] - lengths[i - 1]);
        return add(points[i - 1], scale(sub(points[i], points[i - 1]), t));
      }
    }
    return points[points.length - 1];
  }

  static length(points) { let s = 0; for (let i = 1; i < points.length; i++) s += norm(sub(points[i], points[i - 1])); return s; }

  // A point near the surface (as one interpolated between sampled points is) put back on it, radially.
  onSurface(world) { return this.pointAlong(this.toLocal(world)); }

  // The point at a fraction of the arc from p to q along the section through the centre.
  arcPoint(p, q, fraction, n = 400, via = null) { return this.onSurface(Scalp.along(this.section(p, q, n, via), fraction)); }
  arcLength(p, q, n = 400, via = null) { return Scalp.length(this.section(p, q, n, via)); }

  // The outward normal, by central differences of the radius in the tangent directions.
  normal(world) {
    const { theta, phi } = this.angles(world);
    const h = 1e-3;
    const p = (t, f) => this.point(t, f);
    const dt = sub(p(theta + h, phi), p(theta - h, phi));
    const dp = sub(p(theta, phi + h), p(theta, phi - h));
    const nrm = unit(cross(dt, dp));
    const outward = sub(world, this.centre);
    return dot(nrm, outward) < 0 ? scale(nrm, -1) : nrm;
  }
}

// An ellipsoid with semi-axes a (right), b (anterior), c (superior) about a
// centre, as a scalp. The radius along a unit direction d is
// 1 / sqrt((dx/a)^2 + (dy/b)^2 + (dz/c)^2).
export function ellipsoidScalp({ centre = [0, 0, 0], semiAxes, axes = [[1, 0, 0], [0, 1, 0], [0, 0, 1]], name = 'ellipsoid' }) {
  const [a, b, c] = semiAxes;
  const radius = (d) => 1 / Math.sqrt((d[0] / a) ** 2 + (d[1] / b) ** 2 + (d[2] / c) ** 2);
  const scalp = new Scalp({ centre, axes, radius, name });
  scalp.semiAxes = [a, b, c];
  return scalp;
}

// The landmarks of an ellipsoid head: the ends of its axes. The nasion is the
// anterior end, the inion the posterior end, the preauricular points the
// lateral ends, and the vertex the top.
export function ellipsoidLandmarks(scalp) {
  const [a, b, c] = scalp.semiAxes;
  return {
    nasion: scalp.toWorld([0, b, 0]), inion: scalp.toWorld([0, -b, 0]),
    lpa: scalp.toWorld([-a, 0, 0]), rpa: scalp.toWorld([a, 0, 0]), vertex: scalp.toWorld([0, 0, c]),
  };
}

// A scalp cast through a head mask (a volume of 0 and 1): the radius in a
// direction is the distance to the last voxel inside the mask along the ray
// from the centre, found by stepping and then bisecting. The frame is given by
// the landmarks (CTF convention) or passed directly.
export function maskScalp(mask, { centre, axes, landmarks = null, step = 1, maxRadius = 200, name = 'head' }) {
  if (landmarks) {
    const f = headFrame(landmarks, 'ctf');
    centre = centre || f.origin;
    axes = axes || [scale(f.axes[1], -1), f.axes[0], f.axes[2]];     // ctf: x to the nose, y to the left -> right, anterior, up
  }
  const inside = (p) => sampleVoxel(mask, worldToVoxel(mask, p), { method: 'nearest', outside: 0 }) > 0;
  const localToWorld = (local) => add(centre, add(add(scale(axes[0], local[0]), scale(axes[1], local[1])), scale(axes[2], local[2])));
  const cache = new Map();
  const radius = (d) => {
    const key = `${d[0].toFixed(4)},${d[1].toFixed(4)},${d[2].toFixed(4)}`;
    if (cache.has(key)) return cache.get(key);
    let last = 0;
    for (let r = step; r <= maxRadius; r += step) if (inside(localToWorld(scale(d, r)))) last = r;
    let lo = last, hi = last + step;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (inside(localToWorld(scale(d, mid)))) lo = mid; else hi = mid; }
    cache.set(key, lo);
    return lo;
  };
  return new Scalp({ centre, axes, radius, name });
}

// ---- the 10-20 system --------------------------------------------------------------------

// The midline from the nasion over the vertex to the inion, at tenths of its length.
const MIDLINE = ['Nz', 'Fpz', 'AFz', 'Fz', 'FCz', 'Cz', 'CPz', 'Pz', 'POz', 'Oz', 'Iz'];
// The coronal arc from the left to the right preauricular point over the vertex.
const CORONAL = ['LPA', 'T7', 'C5', 'C3', 'C1', 'Cz', 'C2', 'C4', 'C6', 'T8', 'RPA'];
// The ring through Fpz, T7, Oz and T8, in twentieths of its circumference from Fpz over the left.
const RING = ['Fpz', 'Fp1', 'AF7', 'F7', 'FT7', 'T7', 'TP7', 'P7', 'PO7', 'O1', 'Oz', 'O2', 'PO8', 'P8', 'TP8', 'T8', 'FT8', 'F8', 'AF8', 'Fp2'];
// The lines from a ring point through a midline point to the opposite ring point,
// each half divided equally: [left end, left positions..., midline, right positions..., right end].
const LINES = [
  ['AF7', 'AF3', 'AFz', 'AF4', 'AF8'],
  ['F7', 'F5', 'F3', 'F1', 'Fz', 'F2', 'F4', 'F6', 'F8'],
  ['FT7', 'FC5', 'FC3', 'FC1', 'FCz', 'FC2', 'FC4', 'FC6', 'FT8'],
  ['TP7', 'CP5', 'CP3', 'CP1', 'CPz', 'CP2', 'CP4', 'CP6', 'TP8'],
  ['P7', 'P5', 'P3', 'P1', 'Pz', 'P2', 'P4', 'P6', 'P8'],
  ['PO7', 'PO3', 'POz', 'PO4', 'PO8'],
];
export const TEN_TWENTY = ['Fp1', 'Fp2', 'F7', 'F3', 'Fz', 'F4', 'F8', 'T7', 'C3', 'Cz', 'C4', 'T8', 'P7', 'P3', 'Pz', 'P4', 'P8', 'O1', 'O2'];
export const TEN_TWENTY_NAMES_1985 = { T7: 'T3', T8: 'T4', P7: 'T5', P8: 'T6' };   // the older names of the temporal positions

// The electrode positions of the 10-20 system ('10-20', 19 positions with Fpz
// and Oz) or the 10-10 system ('10-10', 71 positions including the landmarks)
// on a scalp, from its landmarks. Each is {name, position, arc, fraction}.
//
//   1. The midline arc from the nasion to the inion, in a section through the
//      centre, is divided in tenths: Fpz, AFz, Fz, FCz, Cz, CPz, Pz, POz, Oz.
//   2. The coronal arc from LPA to RPA, likewise: T7, C5, C3, C1, Cz, C2, C4, C6, T8.
//      Cz is taken from the midline; the coronal arc's own midpoint is reported
//      as the discrepancy between the two.
//   3. The ring: on every meridian, the point one fifth of the way from the
//      landmark level to the vertex, which is one tenth of the arc from landmark
//      to landmark through the vertex (so that it passes through Fpz, T7, Oz and
//      T8); the closed curve so traced is divided into twentieths from Fpz over
//      the left side: Fp1, AF7, F7, FT7, T7, ... O1, Oz, O2, ... Fp2.
//   4. Each coronal line (AF, F, FC, CP, P, PO) runs from its left ring point
//      through its midline point to its right ring point, each half an arc in a
//      section through the centre, divided into two or four equal parts.
export function tenTwenty(scalp, landmarks, { system = '10-10', samples = 400 } = {}) {
  const out = new Map();
  const put = (name, position, arc, fraction) => out.set(name, { name, position: scalp.onSurface(position), arc, fraction });
  const { nasion, inion, lpa, rpa } = landmarks;
  // The arcs between the landmarks pass over the vertex: the direction of the
  // vertex landmark when given, else straight up in the scalp's frame.
  const up = landmarks.vertex ? unit(scalp.toLocal(landmarks.vertex)) : [0, 0, 1];
  // 1. the midline
  const midline = scalp.section(nasion, inion, samples * 2, up);
  MIDLINE.forEach((name, i) => put(name, Scalp.along(midline, i / 10), 'midline', i / 10));
  const cz = out.get('Cz').position;
  // 2. the coronal arc
  const coronal = scalp.section(lpa, rpa, samples * 2, up);
  CORONAL.forEach((name, i) => { if (name !== 'Cz') put(name, Scalp.along(coronal, i / 10), 'coronal', i / 10); });
  const coronalMid = Scalp.along(coronal, 0.5);
  // 3. the ring: the tenth point of every meridian from the landmark level to the vertex
  const level = (phi) => {
    // The polar angle of the landmark level at azimuth phi, interpolated between the
    // four landmarks (nasion at 90, LPA at 180, inion at 270, RPA at 0 degrees).
    const marks = [[0, scalp.angles(rpa).theta], [Math.PI / 2, scalp.angles(nasion).theta], [Math.PI, scalp.angles(lpa).theta], [1.5 * Math.PI, scalp.angles(inion).theta], [2 * Math.PI, scalp.angles(rpa).theta]];
    let a = ((phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    for (let i = 0; i < 4; i++) {
      if (a >= marks[i][0] && a <= marks[i + 1][0]) {
        const t = (a - marks[i][0]) / (marks[i + 1][0] - marks[i][0]);
        return marks[i][1] + t * (marks[i + 1][1] - marks[i][1]);
      }
    }
    return Math.PI / 2;
  };
  const meridianPoint = (phi, fraction) => {
    const start = scalp.point(level(phi), phi), top = cz;
    return scalp.arcPoint(start, top, fraction, samples, up);
  };
  const ringPoints = [];
  const N = 360;
  for (let i = 0; i <= N; i++) {
    const phi = Math.PI / 2 + (i / N) * 2 * Math.PI;      // from the nasion, over the left (phi increasing), round
    ringPoints.push(meridianPoint(phi, 0.2));
  }
  RING.forEach((name, i) => put(name, Scalp.along(ringPoints, i / 20), 'ring', i / 20));
  // 4. the coronal lines
  for (const line of LINES) {
    const mid = (line.length - 1) / 2;
    const left = out.get(line[0]).position, centre = out.get(line[mid]).position, right = out.get(line[line.length - 1]).position;
    for (let i = 1; i < mid; i++) put(line[i], scalp.arcPoint(left, centre, i / mid, samples), `${line[mid]} line`, i / mid);
    for (let i = mid + 1; i < line.length - 1; i++) put(line[i], scalp.arcPoint(centre, right, (i - mid) / mid, samples), `${line[mid]} line`, (i - mid) / mid);
  }
  const positions = [...out.values()];
  const chosen = system === '10-20' ? positions.filter((p) => TEN_TWENTY.includes(p.name) || p.name === 'Fpz' || p.name === 'Oz') : positions;
  return { system, positions: chosen, czDiscrepancy: norm(sub(cz, coronalMid)), landmarks };
}

// ---- fitting a template to a subject -------------------------------------------------------

// Eigenvectors and eigenvalues of a symmetric 3 x 3 matrix, by Jacobi rotations.
function eigenSymmetric3(S) {
  const a = S.map((r) => r.slice());
  const v = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) off += a[p][q] * a[p][q];
    if (off < 1e-30) break;
    for (let p = 0; p < 3; p++) for (let q = p + 1; q < 3; q++) {
      if (Math.abs(a[p][q]) < 1e-300) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < 3; k++) {
        const akp = a[k][p], akq = a[k][q];
        a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq;
      }
      for (let k = 0; k < 3; k++) {
        const apk = a[p][k], aqk = a[q][k];
        a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk;
      }
      for (let k = 0; k < 3; k++) {
        const vkp = v[k][p], vkq = v[k][q];
        v[k][p] = c * vkp - s * vkq; v[k][q] = s * vkp + c * vkq;
      }
    }
  }
  const order = [0, 1, 2].sort((i, j) => a[j][j] - a[i][i]);
  return { values: order.map((i) => a[i][i]), vectors: order.map((i) => [v[0][i], v[1][i], v[2][i]]) };   // vectors[k] is the k-th eigenvector
}

const det3 = (m) => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
const mul3 = (A, B) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => A[r][0] * B[0][c] + A[r][1] * B[1][c] + A[r][2] * B[2][c]));
const transpose3 = (A) => [0, 1, 2].map((r) => [0, 1, 2].map((c) => A[c][r]));

// The similarity y = s R x + t that best fits target points to source points in
// the least-squares sense (Umeyama 1991, Theorem; with s = 1 when scaling is
// false). At least three points not all on a line. Returns the affine and the
// residual root-mean-square distance.
export function fitSimilarity(source, target, { scaling = true } = {}) {
  const n = source.length;
  if (n < 3 || target.length !== n) throw new Error('fitSimilarity needs at least three matched points');
  const mean = (pts) => scale(pts.reduce((s, p) => add(s, p), [0, 0, 0]), 1 / n);
  const mx = mean(source), my = mean(target);
  const X = source.map((p) => sub(p, mx)), Y = target.map((p) => sub(p, my));
  let varX = 0;
  const Sigma = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < n; i++) {
    varX += dot(X[i], X[i]) / n;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) Sigma[r][c] += Y[i][r] * X[i][c] / n;
  }
  // SVD of Sigma = U D V^T from the eigen-decomposition of Sigma^T Sigma = V D^2 V^T.
  const StS = mul3(transpose3(Sigma), Sigma);
  const { values, vectors } = eigenSymmetric3(StS);
  const V = transpose3(vectors);                 // columns are eigenvectors
  const d = values.map((x) => Math.sqrt(Math.max(0, x)));
  const SV = mul3(Sigma, V);
  const U = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  const columns = [];
  for (let k = 0; k < 3; k++) {
    const col = [SV[0][k], SV[1][k], SV[2][k]];
    columns.push(d[k] > 1e-12 * (d[0] || 1) ? scale(col, 1 / d[k]) : null);
  }
  if (!columns[2]) columns[2] = cross(columns[0], columns[1]);
  if (!columns[1]) { columns[1] = unit(cross(columns[2], columns[0])); }
  columns.forEach((col, k) => { for (let r = 0; r < 3; r++) U[r][k] = col[r]; });
  const S = [[1, 0, 0], [0, 1, 0], [0, 0, det3(U) * det3(V) < 0 ? -1 : 1]];
  const R = mul3(mul3(U, S), transpose3(V));
  const s = scaling ? (d[0] * S[0][0] + d[1] * S[1][1] + d[2] * S[2][2]) / varX : 1;
  const t = sub(my, scale([R[0][0] * mx[0] + R[0][1] * mx[1] + R[0][2] * mx[2], R[1][0] * mx[0] + R[1][1] * mx[1] + R[1][2] * mx[2], R[2][0] * mx[0] + R[2][1] * mx[1] + R[2][2] * mx[2]], s));
  const affine = fromRows([0, 1, 2].map((r) => [s * R[r][0], s * R[r][1], s * R[r][2], t[r]]));
  let rms = 0;
  for (let i = 0; i < n; i++) rms += dot(sub(apply(affine, source[i]), target[i]), sub(apply(affine, source[i]), target[i])) / n;
  return { affine, rotation: R, scale: s, translation: t, rms: Math.sqrt(rms) };
}

// A template head brought to a subject's measurements: the scaling of each axis
// by the ratio of the subject's head length (nasion to inion, straight), breadth
// (between the preauricular points) and height (from the line of the ears to the
// vertex) to the template's, about the template's centre. Each measurement that
// is missing leaves its axis unscaled.
export function scaleToHead(templateLandmarks, measurements, centre) {
  const t = templateLandmarks;
  const length = norm(sub(t.nasion, t.inion)), breadth = norm(sub(t.rpa, t.lpa));
  const earMid = scale(add(t.lpa, t.rpa), 0.5);
  const height = norm(sub(t.vertex, earMid));
  const sx = measurements.breadth ? measurements.breadth / breadth : 1;
  const sy = measurements.length ? measurements.length / length : 1;
  const sz = measurements.height ? measurements.height / height : 1;
  const c = centre || earMid;
  const affine = compose(translation(c), compose(fromRows([[sx, 0, 0, 0], [0, sy, 0, 0], [0, 0, sz, 0]]), translation(scale(c, -1))));
  return { affine, scales: [sx, sy, sz], template: { length, breadth, height } };
}

// ---- values over the scalp -------------------------------------------------------------------

// Legendre polynomials P_1 ... P_N at x, by the recurrence.
function legendre(x, N) {
  const P = [1, x];
  for (let n = 1; n < N; n++) P.push(((2 * n + 1) * x * P[n] - n * P[n - 1]) / (n + 1));
  return P;
}

// The spherical spline interpolation of Perrin et al. (1989): values v_i at
// electrode directions e_i (unit vectors from the head's centre) are
// interpolated over the sphere by v(x) = c_0 + sum_i c_i g(cos gamma_i(x)),
// with g(t) = (1 / 4 pi) sum_{n=1}^{N} (2n + 1) / (n (n + 1))^m P_n(t), their
// eq. (3) with m = 4, and the constraint sum_i c_i = 0; the sum is taken to
// N terms. The result interpolates: v(e_i) = v_i.
export function sphericalSpline(directions, values, { m = 4, terms = 20, regularisation = 0 } = {}) {
  const n = directions.length;
  if (n < 3 || values.length !== n) throw new Error('sphericalSpline needs at least three electrodes with values');
  const e = directions.map(unit);
  const g = (t) => {
    const P = legendre(Math.max(-1, Math.min(1, t)), terms);
    let s = 0;
    for (let k = 1; k <= terms; k++) s += ((2 * k + 1) / (k * (k + 1)) ** m) * P[k];
    return s / (4 * Math.PI);
  };
  // The system [G + lambda I, 1; 1^T, 0] [c; c0] = [v; 0], solved by Gaussian elimination.
  const size = n + 1;
  const A = Array.from({ length: size }, () => new Float64Array(size + 1));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) A[i][j] = g(dot(e[i], e[j])) + (i === j ? regularisation : 0);
    A[i][n] = 1; A[i][size] = values[i];
    A[n][i] = 1;
  }
  for (let col = 0; col < size; col++) {
    let pivot = col;
    for (let r = col + 1; r < size; r++) if (Math.abs(A[r][col]) > Math.abs(A[pivot][col])) pivot = r;
    if (Math.abs(A[pivot][col]) < 1e-300) throw new Error('the spline system is singular: are two electrodes at the same place?');
    [A[col], A[pivot]] = [A[pivot], A[col]];
    for (let r = 0; r < size; r++) {
      if (r === col) continue;
      const f = A[r][col] / A[col][col];
      if (f === 0) continue;
      for (let c = col; c <= size; c++) A[r][c] -= f * A[col][c];
    }
  }
  const c = Array.from({ length: n }, (_, i) => A[i][size] / A[i][i]);
  const c0 = A[n][size] / A[n][n];
  const at = (direction) => {
    const x = unit(direction);
    let s = c0;
    for (let i = 0; i < n; i++) s += c[i] * g(dot(x, e[i]));
    return s;
  };
  return { at, coefficients: c, constant: c0, g };
}

// The projection of a scalp point onto a surface beneath it (the brain, as a
// mask volume): the first voxel inside the mask along the ray from the point
// toward the centre. Null when the ray meets nothing.
export function projectToMask(point, centre, mask, { step = 0.5 } = {}) {
  const d = sub(centre, point);
  const L = norm(d);
  const u = scale(d, 1 / L);
  for (let r = 0; r <= L; r += step) {
    const p = add(point, scale(u, r));
    if (sampleVoxel(mask, worldToVoxel(mask, p), { method: 'nearest', outside: 0 }) > 0) return p;
  }
  return null;
}

export { direction as headDirection, DEG };

// The positions of a placed system by name (as tenTwenty returns them, with the landmarks),
// together with the positions below its ring that recordings name: T9 and T10 at the
// preauricular points, near which they lie at the landmarks' level; A1, A2 (the ear lobes)
// and M1, M2 (the mastoids) there too; Iz at the inion. These are approximations: the
// 10-5 system places them on arcs below the landmarks (Oostenveld and Praamstra 2001).
export function electrodeMap(placed) {
  const at = new Map(placed.positions.map((p) => [p.name, p.position]));
  const lpa = at.get('LPA') || (placed.landmarks && placed.landmarks.lpa), rpa = at.get('RPA') || (placed.landmarks && placed.landmarks.rpa);
  const inion = at.get('Iz') || (placed.landmarks && placed.landmarks.inion);
  for (const [name, p] of [['T9', lpa], ['T10', rpa], ['A1', lpa], ['A2', rpa], ['M1', lpa], ['M2', rpa], ['Iz', inion]]) if (p && !at.has(name)) at.set(name, p);
  return at;
}
