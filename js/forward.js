// Forward models: the potential on the scalp (EEG) and the magnetic field outside the
// head (MEG) of current dipoles in the brain, in concentric spheres.
//
// EEG. The head is a set of concentric spheres, each of one conductivity (brain, skull,
// scalp: Rush and Driscoll 1968). The potential of a point source of current I at r0
// in the innermost sphere is expanded in Legendre polynomials about the source's
// direction: in the source's shell, outside r0,
//
//   phi(r) = I / (4 pi sigma_1) sum_n [ r0^n r^-(n+1) + a_n^1 r^n ] P_n(cos g),
//
// in the shell k, [ a_n^k r^n + b_n^k r^-(n+1) ] P_n(cos g); the coefficients follow, order
// by order, from the continuity of the potential and of the normal current sigma dphi/dr
// at every interface, and from the vanishing of the normal current at the scalp, where
// the head meets the air. Per unit of the singular coefficient, the potential at the
// scalp is T_n (`shellModel`); T_n = (2n + 1)/n for a homogeneous sphere of radius 1
// (Frank 1952). The potential of a dipole q at r0 is the derivative of the source's along
// q (de Munck 1988; Zhang 1995):
//
//   V(r) = 1 / (4 pi sigma_1 R^2) sum_n T_n rho^(n-1) [ n (q . s0) P_n(c) + P_n'(c) (q . s - c (q . s0)) ],
//
// with R the scalp's radius, rho = |r0| / R, s0 and s the directions of r0 and r, c = s0 . s.
//
// MEG. Outside a spherically symmetric conductor the magnetic field of a dipole does not
// depend on the conductivities, and is given in closed form by Sarvas (1987), eq. 25. A
// dipole pointing along the radius makes no field outside the sphere.
//
// A real head is not a sphere. Points are brought into the model's sphere by a radial
// normalisation (`radialNormaliser`): each is moved along its direction from the centre
// in the ratio of the sphere's radius to the scalp's radius in that direction, so that
// electrodes land on the sphere and sources keep their fractional depth beneath the
// scalp. This is an approximation; a boundary-element model of the template's head
// would be the next step.
//
// The constants and the linear algebra are provisional: they belong to physis and calx.

export const MU0 = 4e-7 * Math.PI;          // the magnetic constant, T m / A (CODATA: 1.25663706212e-6)

// The conductivities of Rush and Driscoll's three shells, S/m: brain and scalp 0.33, skull
// 1/80 of it; and their radii, as fractions of the scalp's (Rush and Driscoll 1968).
export const THREE_SHELLS = { radii: [0.87, 0.92, 1], conductivities: [0.33, 0.33 / 80, 0.33] };

// Solve A x = b in place by Gaussian elimination with partial pivoting, the rows and
// columns first scaled to unit maximum (small, possibly badly scaled systems).
function solve(A, b) {
  const n = b.length;
  const colScale = new Float64Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = 0; j < n; j++) m = Math.max(m, Math.abs(A[i][j]));
    if (m > 0) { for (let j = 0; j < n; j++) A[i][j] /= m; b[i] /= m; }
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) colScale[j] = Math.max(colScale[j], Math.abs(A[i][j]));
    if (colScale[j] > 0) for (let i = 0; i < n; i++) A[i][j] /= colScale[j];
  }
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = c + 1; r < n; r++) {
      const f = A[r][c] / A[c][c];
      if (!f) continue;
      for (let k = c; k < n; k++) A[r][k] -= f * A[c][k];
      b[r] -= f * b[c];
    }
  }
  const x = new Float64Array(n);
  for (let r = n - 1; r >= 0; r--) {
    let s = b[r];
    for (let k = r + 1; k < n; k++) s -= A[r][k] * x[k];
    x[r] = s / A[r][r];
  }
  for (let j = 0; j < n; j++) if (colScale[j] > 0) x[j] /= colScale[j];
  return x;
}

// A model of concentric spheres: {radius (mm), radii (fractions, ascending, the last 1),
// conductivities (S/m, from the inside), T (the scalp's coefficient for each order n)}.
export function shellModel({ radius = 90, radii = THREE_SHELLS.radii, conductivities = THREE_SHELLS.conductivities, terms = 120 } = {}) {
  const N = radii.length;
  if (conductivities.length !== N || Math.abs(radii[N - 1] - 1) > 1e-12) throw new Error('shellModel: one conductivity a shell, the last radius 1');
  const T = new Float64Array(terms + 1);
  for (let n = 1; n <= terms; n++) {
    const m = 2 * N - 1;
    const A = Array.from({ length: m }, () => new Float64Array(m));
    const b = new Float64Array(m);
    const ca = (k) => (k === 1 ? 0 : 2 * k - 3), cb = (k) => 2 * k - 2;     // columns of a_k and b_k
    const rn = (R) => R ** n, rm = (R) => R ** -(n + 1), drn = (R) => n * R ** (n - 1), drm = (R) => -(n + 1) * R ** -(n + 2);
    let row = 0;
    for (let k = 1; k < N; k++) {
      const R = radii[k - 1], s1 = conductivities[k - 1], s2 = conductivities[k];
      // the potential: f_k(R) - f_{k+1}(R) = 0
      A[row][ca(k)] += rn(R);
      if (k === 1) b[row] -= rm(R); else A[row][cb(k)] += rm(R);
      A[row][ca(k + 1)] -= rn(R); A[row][cb(k + 1)] -= rm(R);
      row++;
      // the normal current: s_k f_k'(R) - s_{k+1} f_{k+1}'(R) = 0
      A[row][ca(k)] += s1 * drn(R);
      if (k === 1) b[row] -= s1 * drm(R); else A[row][cb(k)] += s1 * drm(R);
      A[row][ca(k + 1)] -= s2 * drn(R); A[row][cb(k + 1)] -= s2 * drm(R);
      row++;
    }
    // no current through the scalp: f_N'(1) = 0
    A[row][ca(N)] += drn(1);
    if (N === 1) b[row] -= drm(1); else A[row][cb(N)] += drm(1);
    const x = solve(A, b);
    T[n] = N === 1 ? 1 + x[0] : x[ca(N)] + x[cb(N)];
  }
  return { radius, radii: radii.slice(), conductivities: conductivities.slice(), T, terms };
}

const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => Math.hypot(a[0], a[1], a[2]);

// The potential (V) at a point r on the scalp of a model of radius R, of a dipole q (A m)
// at r0; r and r0 relative to the centre, in metres.
export function shellPotential(model, r, r0, q) {
  const R = model.radius / 1000, sigma = model.conductivities[0];
  const rr = norm(r), r0n = norm(r0);
  const s = [r[0] / rr, r[1] / rr, r[2] / rr];
  const s0 = r0n > 1e-12 ? [r0[0] / r0n, r0[1] / r0n, r0[2] / r0n] : s;
  const rho = r0n / R;
  const c = Math.max(-1, Math.min(1, dot(s0, s)));
  const qs0 = dot(q, s0), qs = dot(q, s);
  let P0 = 1, P1 = c, D0 = 0, D1 = 1;            // P_{n-1}, P_n and their derivatives
  let sum = 0, pow = 1;                          // pow = rho^(n-1)
  for (let n = 1; n <= model.terms; n++) {
    const term = model.T[n] * pow * (n * qs0 * P1 + D1 * (qs - c * qs0));
    sum += term;
    if (pow < 1e-14 && n > 3) break;
    const P2 = ((2 * n + 1) * c * P1 - n * P0) / (n + 1);
    const D2 = D0 + (2 * n + 1) * P1;
    P0 = P1; P1 = P2; D0 = D1; D1 = D2;
    pow *= rho;
  }
  return sum / (4 * Math.PI * sigma * R * R);
}

// The magnetic field (T) at r of a dipole q (A m) at r0 in a spherically symmetric
// conductor centred at the origin; r and r0 in metres (Sarvas 1987, eq. 25).
export function sarvas(r, r0, q) {
  const a = sub(r, r0), an = norm(a), rn = norm(r);
  const ar = dot(a, r);
  const F = an * (rn * an + rn * rn - dot(r0, r));
  const g1 = an * an / rn + ar / an + 2 * an + 2 * rn, g2 = an + 2 * rn + ar / an;
  const gradF = [g1 * r[0] - g2 * r0[0], g1 * r[1] - g2 * r0[1], g1 * r[2] - g2 * r0[2]];
  const qr0 = cross(q, r0), qr0r = dot(qr0, r);
  const k = MU0 / (4 * Math.PI * F * F);
  return [k * (F * qr0[0] - qr0r * gradF[0]), k * (F * qr0[1] - qr0r * gradF[1]), k * (F * qr0[2] - qr0r * gradF[2])];
}

// The field of the dipole alone, in an infinite medium (Biot and Savart): its radial
// component equals that of the full field outside a sphere (Sarvas 1987).
export function primaryField(r, r0, q) {
  const a = sub(r, r0), an = norm(a);
  const c = cross(q, a), k = MU0 / (4 * Math.PI * an ** 3);
  return [k * c[0], k * c[1], k * c[2]];
}

// ---- the head as a sphere ---------------------------------------------------------------------

// The sphere that best fits points in the least-squares sense of the algebraic distance:
// |p|^2 = 2 c . p + (r^2 - |c|^2), solved for c and r. Returns {centre, radius}.
export function fitSphere(points) {
  const M = Array.from({ length: 4 }, () => new Float64Array(4)), v = new Float64Array(4);
  for (const p of points) {
    const row = [2 * p[0], 2 * p[1], 2 * p[2], 1], y = dot(p, p);
    for (let i = 0; i < 4; i++) { v[i] += row[i] * y; for (let j = 0; j < 4; j++) M[i][j] += row[i] * row[j]; }
  }
  const x = solve(M, v);
  const centre = [x[0], x[1], x[2]];
  return { centre, radius: Math.sqrt(x[3] + dot(centre, centre)) };
}

// The radial normalisation of a head to a sphere of radius R about the scalp's centre: a
// point p (mm) maps to c + (p - c) R / rho(u), rho(u) the scalp's radius in p's direction.
export function radialNormaliser(scalp, R) {
  const c = scalp.centre;
  return (p) => {
    const d = sub(p, c), dn = norm(d) || 1;
    const rho = scalp.radius(scalp.toLocal(p).map((x) => x / dn));
    const f = R / rho;
    return [c[0] + d[0] * f, c[1] + d[1] * f, c[2] + d[2] * f];
  };
}

// ---- lead fields -----------------------------------------------------------------------------

// The EEG lead field: for each electrode e and each source s with orientation n_s, the
// potential at e of a unit dipole at s, in microvolts per nanoampere-metre; electrodes and
// sources in millimetres in the model's frame (centre `centre`), as Float64Array e x s.
// Sources deeper than the brain's sphere allows are kept at 97 % of its radius.
export function eegLeadField(model, centre, electrodes, sources, normals) {
  const E = electrodes.length, S = sources.length;
  const L = new Float64Array(E * S);
  const R = model.radius, inner = 0.97 * model.radii[0] * R;
  const el = electrodes.map((p) => { const d = sub(p, centre), n = norm(d); return d.map((x) => (x / n) * R / 1000); });
  for (let s = 0; s < S; s++) {
    let d = sub(sources[s], centre);
    const dn = norm(d);
    if (dn > inner) d = d.map((x) => (x * inner) / dn);
    const r0 = d.map((x) => x / 1000), q = normals[s];
    for (let e = 0; e < E; e++) L[e * S + s] = shellPotential(model, el[e], r0, q) * 1e-3;   // V per A m -> uV per nA m
  }
  return L;
}

// The MEG lead field: for each sensor (position in mm, unit orientation) and each source,
// the field along the sensor's orientation of a unit dipole, in femtotesla per
// nanoampere-metre, by Sarvas's formula about `centre`.
export function megLeadField(centre, sensors, orientations, sources, normals) {
  const M = sensors.length, S = sources.length;
  const L = new Float64Array(M * S);
  const pos = sensors.map((p) => sub(p, centre).map((x) => x / 1000));
  for (let s = 0; s < S; s++) {
    const r0 = sub(sources[s], centre).map((x) => x / 1000), q = normals[s];
    for (let m = 0; m < M; m++) L[m * S + s] = dot(sarvas(pos[m], r0, q), orientations[m]) * 1e6;   // T per A m -> fT per nA m
  }
  return L;
}

// An idealised whole-head array of radial magnetometers: `count` points spread evenly (a
// Fibonacci lattice) over the part of a sphere of radius `radius` (mm) about `centre`
// above the elevation `lowest` (radians; 0 at the equator), facing outward.
export function idealHelmet(centre, radius, { count = 248, lowest = -0.35 } = {}) {
  const zmin = Math.sin(lowest);
  const out = [], dirs = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; out.length < count && i < 20 * count; i++) {
    const z = 1 - ((i + 0.5) / count) * (1 - zmin);
    if (z < zmin) break;
    const r = Math.sqrt(1 - z * z), t = golden * i;
    const d = [r * Math.cos(t), r * Math.sin(t), z];
    dirs.push(d);
    out.push([centre[0] + radius * d[0], centre[1] + radius * d[1], centre[2] + radius * d[2]]);
  }
  return { positions: out, orientations: dirs };
}

// Points of a surface thinned to one a cell of a cubic grid of `spacing` (mm): the point
// nearest each occupied cell's centre. Returns the indices kept.
export function decimate(points, spacing) {
  const best = new Map();
  points.forEach((p, i) => {
    const cell = p.map((x) => Math.floor(x / spacing));
    const key = `${cell[0]},${cell[1]},${cell[2]}`;
    const centre = cell.map((c) => (c + 0.5) * spacing);
    const d = (p[0] - centre[0]) ** 2 + (p[1] - centre[1]) ** 2 + (p[2] - centre[2]) ** 2;
    const b = best.get(key);
    if (!b || d < b[1]) best.set(key, [i, d]);
  });
  return [...best.values()].map((b) => b[0]).sort((a, b) => a - b);
}
