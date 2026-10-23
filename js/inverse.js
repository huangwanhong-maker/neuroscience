// Inverse methods: from the potentials or fields measured outside the head, an estimate
// of the currents in the brain that made them. The sources are fixed in place and in
// orientation (normal to the cortex); the problem is linear, J = K phi, and
// underdetermined, many more sources than sensors, so that a prior must choose among the
// currents that explain the data.
//
// - MNE, the minimum-norm estimate (Hämäläinen and Ilmoniemi 1994): of all currents that
//   explain the data up to the noise, the one of least weighted norm,
//   K = R L' (L R L' + lambda^2 C)^-1, with R a diagonal depth weighting that offsets the
//   estimate's bias toward superficial sources (Lin et al. 2006).
// - dSPM (Dale et al. 2000): the minimum-norm estimate divided, source by source, by its
//   standard deviation under the noise alone, sqrt(K C K')_ss: a statistic.
// - sLORETA (Pascual-Marqui 2002): the minimum-norm estimate (R = I) divided by the square
//   root of the resolution matrix's diagonal, (K L)_ss: for a single source and no noise
//   its maximum lies exactly at the source.
//
// lambda^2 = trace(L R L') / (n SNR^2) sets the regularisation from an assumed amplitude
// signal-to-noise ratio, as the MNE software does with whitened data; C is the noise
// covariance, the identity when none is given. EEG data and lead fields are first
// referenced to their average.
//
// The linear algebra is provisional: it belongs to calx.

// The Cholesky factor of a symmetric positive definite n x n matrix (row-major), and the
// inverse from it.
function choleskyInverse(A, n) {
  const Lc = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = A[i * n + j];
      for (let k = 0; k < j; k++) s -= Lc[i * n + k] * Lc[j * n + k];
      if (i === j) {
        if (s <= 0) throw new Error('the matrix is not positive definite');
        Lc[i * n + i] = Math.sqrt(s);
      } else Lc[i * n + j] = s / Lc[j * n + j];
    }
  }
  // inv(L), then inv(A) = inv(L)' inv(L).
  const Li = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    Li[i * n + i] = 1 / Lc[i * n + i];
    for (let j = 0; j < i; j++) {
      let s = 0;
      for (let k = j; k < i; k++) s -= Lc[i * n + k] * Li[k * n + j];
      Li[i * n + j] = s / Lc[i * n + i];
    }
  }
  const out = new Float64Array(n * n);
  for (let i = 0; i < n; i++) for (let j = 0; j <= i; j++) {
    let s = 0;
    for (let k = i; k < n; k++) s += Li[k * n + i] * Li[k * n + j];
    out[i * n + j] = out[j * n + i] = s;
  }
  return out;
}

// The lead field referenced to the sensors' average: each column has its mean subtracted.
export function averageReferenced(L, nSensors, nSources) {
  const out = Float64Array.from(L);
  for (let s = 0; s < nSources; s++) {
    let m = 0;
    for (let e = 0; e < nSensors; e++) m += out[e * nSources + s];
    m /= nSensors;
    for (let e = 0; e < nSensors; e++) out[e * nSources + s] -= m;
  }
  return out;
}

// An inverse operator for a lead field L (nSensors x nSources, row-major).
//   method: 'MNE', 'dSPM' or 'sLORETA'; snr: the amplitude signal-to-noise ratio;
//   depth: the exponent of the depth weighting (MNE and dSPM; sLORETA uses none);
//   reference: 'average' for EEG, null for MEG; noise: a covariance (nSensors^2) or null.
// Returns {method, K (nSources x nSensors), scale (per source, or null), lambda2,
// apply(data) -> estimate per source, power(C) -> the estimate's variance per source for
// data of covariance C}.
export function inverseOperator(L0, nSensors, nSources, { method = 'sLORETA', snr = 3, depth = 0.8, reference = 'average', noise = null } = {}) {
  const N = nSensors, S = nSources;
  const L = reference === 'average' ? averageReferenced(L0, N, S) : L0;
  const w = new Float64Array(S).fill(1);
  if (method !== 'sLORETA' && depth > 0) {
    for (let s = 0; s < S; s++) {
      let g = 0;
      for (let e = 0; e < N; e++) g += L[e * S + s] ** 2;
      w[s] = g > 0 ? g ** -depth : 0;
    }
  }
  // G = L R L', and its regularised inverse.
  const G = new Float64Array(N * N);
  for (let i = 0; i < N; i++) for (let j = i; j < N; j++) {
    let t = 0;
    const a = i * S, b = j * S;
    for (let s = 0; s < S; s++) t += L[a + s] * w[s] * L[b + s];
    G[i * N + j] = G[j * N + i] = t;
  }
  let trace = 0;
  for (let i = 0; i < N; i++) trace += G[i * N + i];
  const lambda2 = trace / (N * snr * snr);
  // The noise covariance, scaled to unit mean variance, or the identity.
  let C = null;
  if (noise) {
    let tc = 0;
    for (let i = 0; i < N; i++) tc += noise[i * N + i];
    C = Float64Array.from(noise, (v) => (v * N) / tc);
  }
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) G[i * N + j] += lambda2 * (C ? C[i * N + j] : i === j ? 1 : 0);
  // An average-referenced lead field leaves G singular along the constant vector without
  // regularisation; lambda^2 > 0 keeps it invertible.
  const Gi = choleskyInverse(G, N);
  // K = R L' G^-1
  const K = new Float64Array(S * N);
  for (let s = 0; s < S; s++) for (let e = 0; e < N; e++) {
    let t = 0;
    for (let f = 0; f < N; f++) t += L[f * S + s] * Gi[f * N + e];
    K[s * N + e] = w[s] * t;
  }
  let scale = null;
  if (method === 'dSPM') {
    scale = new Float64Array(S);
    for (let s = 0; s < S; s++) {
      let t = 0;
      if (C) for (let e = 0; e < N; e++) for (let f = 0; f < N; f++) t += K[s * N + e] * C[e * N + f] * K[s * N + f];
      else for (let e = 0; e < N; e++) t += K[s * N + e] ** 2;
      scale[s] = 1 / Math.sqrt(t * lambda2 || 1e-300);
    }
  } else if (method === 'sLORETA') {
    scale = new Float64Array(S);
    for (let s = 0; s < S; s++) {
      let t = 0;
      for (let e = 0; e < N; e++) t += K[s * N + e] * L[e * S + s];
      scale[s] = 1 / Math.sqrt(Math.max(t, 1e-300));
    }
  }
  const center = (x) => {
    if (reference !== 'average') return x;
    let m = 0;
    for (let i = 0; i < N; i++) m += x[i];
    m /= N;
    return Array.from(x, (v) => v - m);
  };
  return {
    method, K, scale, lambda2, nSensors: N, nSources: S, weights: w,
    apply(data, out = new Float64Array(S)) {
      const x = center(data);
      for (let s = 0; s < S; s++) {
        let t = 0;
        const row = s * N;
        for (let e = 0; e < N; e++) t += K[row + e] * x[e];
        out[s] = scale ? t * scale[s] : t;
      }
      return out;
    },
    // The variance of the estimate at each source for data of covariance Cd (N x N):
    // diag(K H Cd H K'), scaled as the estimate is, i.e. the power of the sources in the
    // band the covariance was taken from.
    power(Cd) {
      let Cx = Cd;
      if (reference === 'average') {
        Cx = Float64Array.from(Cd);
        const rows = new Float64Array(N), cols = new Float64Array(N);
        let all = 0;
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { rows[i] += Cd[i * N + j] / N; cols[j] += Cd[i * N + j] / N; all += Cd[i * N + j] / (N * N); }
        for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) Cx[i * N + j] = Cd[i * N + j] - rows[i] - cols[j] + all;
      }
      const out = new Float64Array(S);
      const tmp = new Float64Array(N);
      for (let s = 0; s < S; s++) {
        const row = s * N;
        for (let j = 0; j < N; j++) { let t = 0; for (let i = 0; i < N; i++) t += K[row + i] * Cx[i * N + j]; tmp[j] = t; }
        let v = 0;
        for (let j = 0; j < N; j++) v += tmp[j] * K[row + j];
        out[s] = scale ? v * scale[s] * scale[s] : v;
      }
      return out;
    },
  };
}
