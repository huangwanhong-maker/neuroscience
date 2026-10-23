// Signals: recordings of the brain's electrical and magnetic activity, read from their
// file formats, and the operations that turn them into maps: names of channels,
// re-referencing, filtering, analytic envelopes, spectra, band power, epochs and the
// global field power.
//
// A recording is {format, rate (Hz), duration (s), start, channels: [{label, name,
// unit, data: Float32Array in physical units}], annotations: [{onset (s), duration (s),
// text}]}. Every channel of a recording shares its rate; channels sampled otherwise (an
// EDF's status or annotation channels) are kept apart in `others`.
//
// Formats: EDF and EDF+ (Kemp et al. 1992; Kemp and Olivan 2003), BDF (BioSemi's 24-bit
// EDF), BrainVision (Brain Products' header, marker and binary data files), and a table
// of columns. Frequency bands follow the International Federation of Clinical
// Neurophysiology's glossary (Kane et al. 2017).
//
// The FFT, the filters and the spectral estimates are general numerics, which belong to
// calx; they are written here provisionally, as plain JavaScript on Float64Arrays.

import { TEN_TWENTY_NAMES_1985 } from './head.js';

// ---- the European Data Format ---------------------------------------------------------------

const ascii = (bytes, from, length) => {
  let s = '';
  for (let i = from; i < from + length; i++) s += String.fromCharCode(bytes[i]);
  return s.trim();
};

// An EDF, EDF+ or BDF file, from its bytes. EDF stores 16-bit little-endian integers,
// BDF 24-bit; each is scaled to physical units by the channel's digital and physical
// ranges: x = (d - dmin) (pmax - pmin) / (dmax - dmin) + pmin. An EDF+ "EDF Annotations"
// channel holds time-stamped annotation lists, decoded into `annotations`.
export function readEdf(input) {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const bdf = bytes[0] === 255 && ascii(bytes, 1, 7) === 'BIOSEMI';
  const reserved = ascii(bytes, 192, 44);
  const headerBytes = Number(ascii(bytes, 184, 8));
  let records = Number(ascii(bytes, 236, 8));
  const recordDuration = Number(ascii(bytes, 244, 8));
  const ns = Number(ascii(bytes, 252, 4));
  if (!(ns > 0) || !(headerBytes === 256 * (ns + 1))) throw new Error('not an EDF file: the header does not describe its signals');
  const field = (offset, width) => Array.from({ length: ns }, (_, i) => ascii(bytes, 256 + offset * ns + i * width, width));
  let o = 0;
  const labels = field(o, 16); o += 16;
  const transducers = field(o, 80); o += 80;
  const units = field(o, 8); o += 8;
  const pmin = field(o, 8).map(Number); o += 8;
  const pmax = field(o, 8).map(Number); o += 8;
  const dmin = field(o, 8).map(Number); o += 8;
  const dmax = field(o, 8).map(Number); o += 8;
  const prefilters = field(o, 80); o += 80;
  const samples = field(o, 8).map(Number);
  const width = bdf ? 3 : 2;
  const recordBytes = samples.reduce((t, n) => t + n * width, 0);
  // A file whose record count is unknown (-1) has as many as fit.
  if (!(records > 0)) records = Math.floor((bytes.length - headerBytes) / recordBytes);
  records = Math.min(records, Math.floor((bytes.length - headerBytes) / recordBytes));
  const isAnnotation = labels.map((l) => l === 'EDF Annotations' || l === 'BDF Annotations');
  const data = samples.map((n, i) => (isAnnotation[i] ? null : new Float32Array(n * records)));
  const text = isAnnotation.map((a) => (a ? [] : null));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const gain = samples.map((_, i) => (pmax[i] - pmin[i]) / (dmax[i] - dmin[i] || 1));
  let p = headerBytes;
  for (let r = 0; r < records; r++) {
    for (let i = 0; i < ns; i++) {
      const n = samples[i];
      if (isAnnotation[i]) { text[i].push(bytes.subarray(p, p + n * width)); p += n * width; continue; }
      const out = data[i], base = r * n, g = gain[i], d0 = dmin[i], p0 = pmin[i];
      for (let k = 0; k < n; k++) {
        let d;
        if (bdf) { d = bytes[p] | (bytes[p + 1] << 8) | (bytes[p + 2] << 16); if (d & 0x800000) d -= 0x1000000; p += 3; }
        else { d = view.getInt16(p, true); p += 2; }
        out[base + k] = (d - d0) * g + p0;
      }
    }
  }
  const annotations = [];
  for (let i = 0; i < ns; i++) if (isAnnotation[i]) for (const chunk of text[i]) annotations.push(...readTals(chunk));
  const start = parseEdfStart(ascii(bytes, 168, 8), ascii(bytes, 176, 8));
  const all = labels.map((label, i) => ({
    label, name: channelName(label), unit: units[i], transducer: transducers[i], prefilter: prefilters[i],
    rate: recordDuration > 0 ? samples[i] / recordDuration : samples[i], data: data[i],
  })).filter((c, i) => !isAnnotation[i]);
  // The channels at the commonest rate make the recording; the rest are kept aside.
  const rates = new Map();
  for (const c of all) rates.set(c.rate, (rates.get(c.rate) || 0) + 1);
  const rate = [...rates].sort((a, b) => b[1] - a[1])[0]?.[0] || 0;
  return {
    format: bdf ? 'BDF' : reserved.startsWith('EDF+') ? reserved.slice(0, 5) : 'EDF',
    patient: ascii(bytes, 8, 80), recording: ascii(bytes, 88, 80), start,
    rate, duration: records * recordDuration,
    channels: all.filter((c) => c.rate === rate),
    others: all.filter((c) => c.rate !== rate),
    annotations: annotations.filter((a) => a.text),
  };
}

// The time-stamped annotation lists of an EDF+ record: "+onset[\x15duration]\x14text\x14...\x14\x00".
function readTals(chunk) {
  const out = [];
  let s = '';
  for (let i = 0; i < chunk.length; i++) s += String.fromCharCode(chunk[i]);
  for (const tal of s.split('\x00')) {
    if (!tal) continue;
    const parts = tal.split('\x14');
    const [onsetText, durationText] = parts[0].split('\x15');
    const onset = Number(onsetText);
    if (!Number.isFinite(onset)) continue;
    const duration = durationText ? Number(durationText) : 0;
    for (const t of parts.slice(1)) if (t) out.push({ onset, duration, text: decodeUtf8Latin(t) });
  }
  return out;
}

const decodeUtf8Latin = (t) => { try { return decodeURIComponent(escape(t)); } catch { return t; } };

function parseEdfStart(date, time) {
  const [d, m, y] = date.split('.').map(Number), [hh, mm, ss] = time.split('.').map(Number);
  if (![d, m, y, hh, mm, ss].every(Number.isFinite)) return null;
  // EDF's two-digit years: 1985-2084 (the clipping date of the specification).
  const year = y >= 85 ? 1900 + y : 2000 + y;
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// ---- BrainVision ------------------------------------------------------------------------------

const ini = (text) => {
  const out = {};
  let section = '';
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith(';')) continue;
    const m = line.match(/^\[(.+)\]$/);
    if (m) { section = m[1]; out[section] = out[section] || {}; continue; }
    const eq = line.indexOf('=');
    if (eq > 0 && section) out[section][line.slice(0, eq).trim()] = line.slice(eq + 1);
  }
  return out;
};

// A BrainVision recording: the header's text, the binary data and, if given, the markers'
// text. Multiplexed or vectorised, 16-bit integers or 32-bit floats, each channel scaled
// by its resolution.
export function readBrainVision({ header, data, markers = null }) {
  const h = ini(header);
  const common = h['Common Infos'] || {}, binary = h['Binary Infos'] || {}, infos = h['Channel Infos'] || {};
  const n = Number(common.NumberOfChannels);
  const rate = 1e6 / Number(common.SamplingInterval);
  if (!(n > 0) || !(rate > 0)) throw new Error('not a BrainVision header: no channels or sampling interval');
  if ((common.DataFormat || 'BINARY').toUpperCase() !== 'BINARY') throw new Error('only binary BrainVision data are read');
  const format = (binary.BinaryFormat || 'INT_16').toUpperCase();
  const width = format === 'IEEE_FLOAT_32' ? 4 : format === 'INT_32' ? 4 : 2;
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = Math.floor(bytes.length / (width * n));
  const vectorised = (common.DataOrientation || 'MULTIPLEXED').toUpperCase() === 'VECTORIZED';
  const channels = [];
  for (let c = 0; c < n; c++) {
    const [label = `Ch${c + 1}`, , res = '1', unit = 'µV'] = (infos[`Ch${c + 1}`] || '').split(',');
    const scale = Number(res) || 1;
    const out = new Float32Array(count);
    for (let t = 0; t < count; t++) {
      const at = width * (vectorised ? c * count + t : t * n + c);
      out[t] = (format === 'IEEE_FLOAT_32' ? view.getFloat32(at, true) : format === 'INT_32' ? view.getInt32(at, true) : view.getInt16(at, true)) * scale;
    }
    channels.push({ label: label.replace(/\\1/g, ','), name: channelName(label), unit: unit || 'µV', data: out });
  }
  const annotations = [];
  if (markers) {
    const mk = ini(markers)['Marker Infos'] || {};
    for (const v of Object.values(mk)) {
      const [type, description, position, points] = v.split(',');
      if (!position) continue;
      annotations.push({ onset: (Number(position) - 1) / rate, duration: (Number(points) || 0) / rate, text: description ? description.trim() : type });
    }
  }
  return { format: 'BrainVision', rate, duration: count / rate, start: null, channels, others: [], annotations };
}

// ---- a table of columns ---------------------------------------------------------------------------

// A recording from text: one column a channel, named in the first line; a first column
// named time (or t, seconds) gives the rate, else the rate is passed.
export function readSignalTable(text, { rate = null } = {}) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
  const split = (l) => l.split(/[\t,;]|\s{2,}/).map((x) => x.trim());
  const head = split(lines[0]);
  const rows = lines.slice(1).map((l) => split(l).map(Number));
  const timeColumn = /^(time|t|seconds?|s)$/i.test(head[0]) ? 0 : -1;
  if (timeColumn === 0 && rows.length > 1) rate = 1 / ((rows[rows.length - 1][0] - rows[0][0]) / (rows.length - 1));
  if (!(rate > 0)) throw new Error('the rate is not given and there is no time column');
  const channels = head.map((label, c) => ({ label, c })).filter(({ c }) => c !== timeColumn)
    .map(({ label, c }) => ({ label, name: channelName(label), unit: '', data: Float32Array.from(rows, (r) => r[c]) }));
  return { format: 'table', rate, duration: rows.length / rate, start: null, channels, others: [], annotations: [] };
}

// ---- the names of channels ----------------------------------------------------------------------

// The 10-5 names this domain knows: the 10-10 system (Oostenveld and Praamstra 2001) and
// the positions below its ring that recordings use (T9, T10, the landmarks).
const KNOWN = ['Fp1', 'Fpz', 'Fp2', 'AF7', 'AF3', 'AFz', 'AF4', 'AF8', 'F9', 'F7', 'F5', 'F3', 'F1', 'Fz', 'F2', 'F4', 'F6', 'F8', 'F10',
  'FT9', 'FT7', 'FC5', 'FC3', 'FC1', 'FCz', 'FC2', 'FC4', 'FC6', 'FT8', 'FT10', 'T9', 'T7', 'C5', 'C3', 'C1', 'Cz', 'C2', 'C4', 'C6', 'T8', 'T10',
  'TP9', 'TP7', 'CP5', 'CP3', 'CP1', 'CPz', 'CP2', 'CP4', 'CP6', 'TP8', 'TP10', 'P9', 'P7', 'P5', 'P3', 'P1', 'Pz', 'P2', 'P4', 'P6', 'P8', 'P10',
  'PO9', 'PO7', 'PO3', 'POz', 'PO4', 'PO8', 'PO10', 'O1', 'Oz', 'O2', 'O9', 'O10', 'I1', 'Iz', 'I2', 'Nz', 'LPA', 'RPA', 'A1', 'A2', 'M1', 'M2'];
const BY_UPPER = new Map(KNOWN.map((n) => [n.toUpperCase(), n]));
const OLD = Object.fromEntries(Object.entries(TEN_TWENTY_NAMES_1985).map(([now, before]) => [before.toUpperCase(), now]));

// The standard name of a channel's label, or null: "EEG Fp1-REF", "FP1", "Fp1." and "Fp1"
// all name Fp1; the old temporal names (T3, T4, T5, T6) are given their 10-10 names.
export function channelName(label) {
  let s = String(label).trim().replace(/^(EEG|EOG|MEG|ECG|EMG)[\s_:-]+/i, '').replace(/\.+$/, '');
  s = s.split(/[-–/:\s]/)[0];
  const u = s.toUpperCase();
  if (OLD[u]) return OLD[u];
  return BY_UPPER.get(u) || null;
}

// ---- the FFT and filters (provisional numerics: they belong to calx) ---------------------------------

export const nextPow2 = (n) => 2 ** Math.ceil(Math.log2(Math.max(1, n)));

// The discrete Fourier transform in place, radix 2, of arrays of a power-of-two length:
// X_k = sum_n x_n exp(-2 pi i k n / N), or its inverse (with 1/N) when inverse is true.
export function fft(re, im, inverse = false) {
  const n = re.length;
  if (n & (n - 1)) throw new Error('fft: the length must be a power of two');
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI / len) * (inverse ? 1 : -1);
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2;
        const xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - xr; im[b] = im[a] - xi;
        re[a] += xr; im[a] += xi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

// A signal extended at both ends by its mirror image, to a power of two, so that the
// circular convolution of FFT filtering does not join its end to its beginning.
function mirrored(x, pad) {
  const n = x.length, N = nextPow2(n + 2 * pad);
  const re = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    let k = i - pad;
    while (k < 0 || k >= n) k = k < 0 ? -k : 2 * (n - 1) - k;
    re[i] = x[k];
  }
  return re;
}

// The gain of a band-pass with raised-cosine edges at frequency f: 1 between lo and hi,
// falling to 0 over `width` Hz beyond each (lo = 0: a low-pass; hi = Infinity: a high-pass).
export function bandGain(f, lo, hi, width) {
  const a = Math.abs(f);
  if (lo > 0 && a < lo) return a <= lo - width ? 0 : 0.5 * (1 + Math.cos(Math.PI * (lo - a) / width));
  if (Number.isFinite(hi) && a > hi) return a >= hi + width ? 0 : 0.5 * (1 + Math.cos(Math.PI * (a - hi) / width));
  return 1;
}

// A zero-phase band-pass by the FFT: the spectrum multiplied by bandGain. The transition
// width defaults to a quarter of the lower edge, at least 0.5 Hz.
export function bandpass(x, rate, lo, hi, { width = null } = {}) {
  const w = width || Math.max(0.5, 0.25 * (lo || hi || 1));
  const pad = Math.min(x.length - 1, Math.round(rate));
  const re = mirrored(x, pad), im = new Float64Array(re.length);
  fft(re, im);
  const N = re.length;
  for (let k = 0; k < N; k++) {
    const f = (k <= N / 2 ? k : k - N) * rate / N;
    const g = bandGain(f, lo, hi, w);
    re[k] *= g; im[k] *= g;
  }
  fft(re, im, true);
  return Float32Array.from({ length: x.length }, (_, i) => re[i + pad]);
}

// The analytic signal x + i H[x] (the Hilbert transform by the FFT: negative frequencies
// removed, positive ones doubled), optionally band-limited: {re, im, envelope, phase}.
export function analytic(x, rate = 1, { lo = 0, hi = Infinity, width = null } = {}) {
  const w = width || Math.max(0.5, 0.25 * (lo || 1));
  const pad = Math.min(x.length - 1, Math.round(rate));
  const re = mirrored(x, pad), im = new Float64Array(re.length);
  fft(re, im);
  const N = re.length;
  for (let k = 0; k < N; k++) {
    const f = k * rate / N;
    const g = k === 0 || k === N / 2 ? (lo > 0 ? 0 : 1) : k < N / 2 ? 2 * bandGain(f, lo, hi, w) : 0;
    re[k] *= g; im[k] *= g;
  }
  fft(re, im, true);
  const n = x.length;
  const out = { re: new Float32Array(n), im: new Float32Array(n), envelope: new Float32Array(n), phase: new Float32Array(n) };
  for (let i = 0; i < n; i++) {
    const a = re[i + pad], b = im[i + pad];
    out.re[i] = a; out.im[i] = b; out.envelope[i] = Math.hypot(a, b); out.phase[i] = Math.atan2(b, a);
  }
  return out;
}

// ---- spectra ---------------------------------------------------------------------------------------

// The power spectral density by Welch's method (Welch 1967): Hann-windowed segments of
// `segment` seconds overlapping by half, their periodograms averaged; one-sided, in the
// signal's unit squared per hertz. Returns {freqs, power}.
export function welch(x, rate, { segment = 2, overlap = 0.5, from = 0, to = null } = {}) {
  const n0 = Math.round(from * rate), n1 = to === null ? x.length : Math.min(x.length, Math.round(to * rate));
  const L = Math.min(n1 - n0, Math.round(segment * rate));
  const N = nextPow2(L);
  const step = Math.max(1, Math.round(L * (1 - overlap)));
  const win = Float64Array.from({ length: L }, (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (L - 1)));
  const U = win.reduce((s, v) => s + v * v, 0);
  const power = new Float64Array(N / 2 + 1);
  let count = 0;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let s = n0; s + L <= n1; s += step) {
    let mean = 0;
    for (let i = 0; i < L; i++) mean += x[s + i];
    mean /= L;
    re.fill(0); im.fill(0);
    for (let i = 0; i < L; i++) re[i] = (x[s + i] - mean) * win[i];
    fft(re, im);
    for (let k = 0; k <= N / 2; k++) power[k] += (re[k] * re[k] + im[k] * im[k]) * (k === 0 || k === N / 2 ? 1 : 2) / (rate * U);
    count++;
  }
  for (let k = 0; k < power.length; k++) power[k] /= Math.max(1, count);
  return { freqs: Float64Array.from({ length: N / 2 + 1 }, (_, k) => (k * rate) / N), power };
}

// The power in a band of a spectrum: the integral of the density from lo to hi.
export function bandPower({ freqs, power }, lo, hi) {
  let s = 0;
  const df = freqs[1] - freqs[0];
  for (let k = 0; k < freqs.length; k++) if (freqs[k] >= lo && freqs[k] < hi) s += power[k] * df;
  return s;
}

// The frequency bands of clinical neurophysiology (Kane et al. 2017): delta below 4 Hz,
// theta 4 to under 8, alpha 8 to 13, beta 14 to 30, gamma above 30. The edges between
// bands are taken half-open here, [lo, hi), so that the bands tile the spectrum; delta
// from 1 Hz, gamma to 45 Hz, below the mains frequencies.
export const BANDS = {
  delta: { name: 'Delta', lo: 1, hi: 4 },
  theta: { name: 'Theta', lo: 4, hi: 8 },
  alpha: { name: 'Alpha', lo: 8, hi: 13 },
  beta: { name: 'Beta', lo: 13, hi: 30 },
  gamma: { name: 'Gamma', lo: 30, hi: 45 },
};

// The frequency of the largest peak of a spectrum between lo and hi, refined by a parabola
// through the three bins about it.
export function peakFrequency({ freqs, power }, lo, hi) {
  let best = -1;
  for (let k = 1; k < freqs.length - 1; k++) if (freqs[k] >= lo && freqs[k] <= hi && (best < 0 || power[k] > power[best])) best = k;
  if (best < 1) return null;
  const a = Math.log(power[best - 1] || 1e-30), b = Math.log(power[best]), c = Math.log(power[best + 1] || 1e-30);
  const d = (a - 2 * b + c) === 0 ? 0 : 0.5 * (a - c) / (a - 2 * b + c);
  return freqs[best] + d * (freqs[1] - freqs[0]);
}

// ---- across channels ---------------------------------------------------------------------------------

// The channels re-referenced to their average: at each instant the mean is subtracted.
export function averageReference(channels) {
  const n = channels[0].data.length, m = channels.length;
  const mean = new Float64Array(n);
  for (const c of channels) for (let t = 0; t < n; t++) mean[t] += c.data[t] / m;
  return channels.map((c) => ({ ...c, data: Float32Array.from(c.data, (v, t) => v - mean[t]) }));
}

// The global field power (Lehmann and Skrandies 1980): the spatial standard deviation of
// the potentials at each instant, about their mean.
export function globalFieldPower(channels) {
  const n = channels[0].data.length, m = channels.length;
  const out = new Float32Array(n);
  for (let t = 0; t < n; t++) {
    let s = 0, s2 = 0;
    for (const c of channels) { const v = c.data[t]; s += v; s2 += v * v; }
    out[t] = Math.sqrt(Math.max(0, s2 / m - (s / m) ** 2));
  }
  return out;
}

// The covariance of the channels over the samples from t0 to t1, as an m x m Float64Array.
export function covariance(channels, t0 = 0, t1 = null) {
  const m = channels.length, n1 = t1 === null ? channels[0].data.length : t1;
  const C = new Float64Array(m * m);
  const means = channels.map((c) => { let s = 0; for (let t = t0; t < n1; t++) s += c.data[t]; return s / (n1 - t0); });
  for (let i = 0; i < m; i++) for (let j = i; j < m; j++) {
    const a = channels[i].data, b = channels[j].data, ma = means[i], mb = means[j];
    let s = 0;
    for (let t = t0; t < n1; t++) s += (a[t] - ma) * (b[t] - mb);
    C[i * m + j] = C[j * m + i] = s / Math.max(1, n1 - t0 - 1);
  }
  return C;
}

// The intervals of a recording that an annotation marks: [{text, from, to}] in seconds,
// each annotation lasting until its duration, or until the next one when it has none.
export function intervals(recording, text = null) {
  const a = recording.annotations.slice().sort((p, q) => p.onset - q.onset);
  const out = [];
  a.forEach((x, i) => {
    if (text !== null && x.text !== text) return;
    const to = x.duration > 0 ? x.onset + x.duration : i + 1 < a.length ? a[i + 1].onset : recording.duration;
    out.push({ text: x.text, from: x.onset, to: Math.min(to, recording.duration) });
  });
  return out;
}
