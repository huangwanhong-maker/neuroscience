// The NRRD file format ("nearly raw raster data"; Kindlmann, teem,
// http://teem.sourceforge.net/nrrd/format.html, retrieved 2026-10-22), read
// from bytes, as the Allen Institute distributes the mouse brain atlas.
//
// A file is a text header, ended by a blank line, then the data. The header
// gives the sample type, the number of axes and their sizes (the first axis
// fastest in the data), the encoding (raw, gzip or ascii), the byte order, and
// the placement of the grid: `space` names the world frame (left-posterior-
// superior, right-anterior-superior, ...), `space directions` gives, for each
// axis, the world step of one sample, and `space origin` the world position of
// the centre of the first sample. These make the voxel-to-world affine as
// affine.js has it; the reader also converts it to RAS when the frame is a
// named anatomical one.
//
// Caveat. The orientation a header claims is only as good as its writer: the
// Allen CCFv3 files say left-posterior-superior while the atlas's own
// convention is posterior-inferior-right (spaces.js), which the atlas module
// imposes in place of the header's.
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { fromRows, toRAS } from './affine.js';
import { volume } from './volume.js';

const TYPES = new Map([
  [['signed char', 'int8', 'int8_t'], Int8Array],
  [['uchar', 'unsigned char', 'uint8', 'uint8_t'], Uint8Array],
  [['short', 'short int', 'signed short', 'signed short int', 'int16', 'int16_t'], Int16Array],
  [['ushort', 'unsigned short', 'unsigned short int', 'uint16', 'uint16_t'], Uint16Array],
  [['int', 'signed int', 'int32', 'int32_t'], Int32Array],
  [['uint', 'unsigned int', 'uint32', 'uint32_t'], Uint32Array],
  [['longlong', 'long long', 'long long int', 'signed long long', 'signed long long int', 'int64', 'int64_t'], BigInt64Array],
  [['ulonglong', 'unsigned long long', 'unsigned long long int', 'uint64', 'uint64_t'], BigUint64Array],
  [['float'], Float32Array],
  [['double'], Float64Array],
].flatMap(([names, ctor]) => names.map((n) => [n, ctor])));

const FRAMES = {
  'right-anterior-superior': 'RAS', ras: 'RAS',
  'left-anterior-superior': 'LAS', las: 'LAS',
  'left-posterior-superior': 'LPS', lps: 'LPS',
  'right-anterior-superior-time': 'RAS', rast: 'RAS',
  'left-anterior-superior-time': 'LAS', last: 'LAS',
  'left-posterior-superior-time': 'LPS', lpst: 'LPS',
};

const asBytes = (b) => (b instanceof Uint8Array ? b : b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
const PLATFORM_LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

const vectors = (s) => [...s.matchAll(/\(([^)]*)\)|none/g)].map((m) => (m[0] === 'none' ? null : m[1].split(',').map(Number)));

// The header fields and key-value pairs, and where the data begins.
export function readNrrdHeader(input) {
  const bytes = asBytes(input);
  let end = -1, i = 0;
  while (i < bytes.length) {
    if (bytes[i] === 0x0a && (bytes[i + 1] === 0x0a || (bytes[i + 1] === 0x0d && bytes[i + 2] === 0x0a))) { end = i; break; }
    i++;
  }
  if (end < 0) throw new Error('not a NRRD file: no blank line ends the header');
  let headerText = '';
  for (let n = 0; n < end; n++) headerText += String.fromCharCode(bytes[n]);
  const dataOffset = bytes[end + 1] === 0x0d ? end + 3 : end + 2;
  const lines = headerText.split(/\r?\n/);
  const magic = lines.shift();
  if (!/^NRRD000[1-5]$/.test(magic)) throw new Error(`not a NRRD file: first line "${magic}"`);
  const fields = {}, keyValues = {};
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const kv = line.indexOf(':=');
    if (kv > 0) { keyValues[line.slice(0, kv)] = line.slice(kv + 2); continue; }
    const colon = line.indexOf(': ');
    if (colon < 0) continue;
    fields[line.slice(0, colon).toLowerCase()] = line.slice(colon + 2).trim();
  }
  const h = { version: Number(magic.slice(4)), fields, keyValues, dataOffset };
  for (const required of ['type', 'dimension', 'sizes', 'encoding']) if (!(required in fields)) throw new Error(`NRRD header without ${required}`);
  h.type = fields.type;
  h.dimension = Number(fields.dimension);
  h.sizes = fields.sizes.split(/\s+/).map(Number);
  h.encoding = fields.encoding.toLowerCase();
  h.littleEndian = (fields.endian || 'little').toLowerCase() !== 'big';
  h.space = fields.space || null;
  h.frame = h.space ? FRAMES[h.space.toLowerCase()] || null : null;
  h.spaceDirections = fields['space directions'] ? vectors(fields['space directions']) : null;
  h.spaceOrigin = fields['space origin'] ? vectors(fields['space origin'])[0] : null;
  h.kinds = fields.kinds ? fields.kinds.split(/\s+/) : null;
  h.dataFile = fields['data file'] || fields.datafile || null;
  h.byteSkip = fields['byte skip'] ? Number(fields['byte skip']) : 0;
  h.lineSkip = fields['line skip'] ? Number(fields['line skip']) : 0;
  return h;
}

// The voxel-to-world affine of the header, in the header's own frame: the
// columns are the space directions of the three spatial axes, the translation
// the space origin. Axes without a direction ("none") are not spatial.
export function nrrdAffine(h) {
  const dirs = (h.spaceDirections || []).filter((d) => d);
  if (dirs.length !== 3) throw new Error(`the header places ${dirs.length} axes in space, not 3`);
  const o = h.spaceOrigin || [0, 0, 0];
  return fromRows([0, 1, 2].map((r) => [dirs[0][r], dirs[1][r], dirs[2][r], o[r]]));
}

function decode(bytes, offset, count, Ctor, little) {
  const size = Ctor.BYTES_PER_ELEMENT;
  const big = Ctor === BigInt64Array || Ctor === BigUint64Array;
  if (bytes.byteLength < offset + count * size) throw new Error(`the data is short: ${bytes.byteLength - offset} bytes for ${count} samples of ${size}`);
  if (!big && little === PLATFORM_LITTLE && (bytes.byteOffset + offset) % size === 0) return new Ctor(bytes.buffer, bytes.byteOffset + offset, count).slice();
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset, count * size);
  const out = new (big ? Float64Array : Ctor)(count);
  const get = {
    1: (o) => (Ctor === Int8Array ? view.getInt8(o) : view.getUint8(o)),
    2: (o) => (Ctor === Int16Array ? view.getInt16(o, little) : view.getUint16(o, little)),
    4: (o) => (Ctor === Int32Array ? view.getInt32(o, little) : Ctor === Uint32Array ? view.getUint32(o, little) : view.getFloat32(o, little)),
    8: (o) => (Ctor === Float64Array ? view.getFloat64(o, little) : Ctor === BigInt64Array ? Number(view.getBigInt64(o, little)) : Number(view.getBigUint64(o, little))),
  }[size];
  for (let n = 0; n < count; n++) out[n] = get(n * size);
  return out;
}

// A volume from the bytes of a NRRD file. Gzip-encoded data need an `inflate`
// function; a detached data file is given as `data`.
export function readNrrd(input, { inflate, data: detached } = {}) {
  const bytes = asBytes(input);
  const header = readNrrdHeader(bytes);
  const Ctor = TYPES.get(header.type.toLowerCase());
  if (!Ctor) throw new Error(`unsupported NRRD type ${header.type}`);
  const count = header.sizes.reduce((p, d) => p * d, 1);
  let source, offset;
  if (header.dataFile) {
    if (!detached) throw new Error(`the data are in ${header.dataFile}: pass them as data`);
    source = asBytes(detached); offset = 0;
  } else {
    source = bytes; offset = header.dataOffset;
  }
  let values;
  if (header.encoding === 'raw') {
    const skip = header.byteSkip >= 0 ? header.byteSkip : source.byteLength - offset - count * Ctor.BYTES_PER_ELEMENT;
    values = decode(source, offset + skip, count, Ctor, header.littleEndian);
  } else if (header.encoding === 'gzip' || header.encoding === 'gz') {
    if (!inflate) throw new Error('gzip-encoded NRRD: pass an inflate function');
    const raw = asBytes(inflate(source.subarray(offset + Math.max(0, header.byteSkip))));
    values = decode(raw, 0, count, Ctor, header.littleEndian);
  } else if (header.encoding === 'ascii' || header.encoding === 'text' || header.encoding === 'txt') {
    let s = '';
    for (let n = offset; n < source.length; n++) s += String.fromCharCode(source[n]);
    const numbers = s.trim().split(/\s+/).map(Number);
    if (numbers.length < count) throw new Error(`the text has ${numbers.length} numbers for ${count} samples`);
    values = (Ctor === BigInt64Array || Ctor === BigUint64Array ? Float64Array : Ctor).from(numbers.slice(0, count));
  } else {
    throw new Error(`unsupported NRRD encoding ${header.encoding}`);
  }
  const dims = header.sizes.slice();
  while (dims.length < 3) dims.push(1);
  let headerAffine = null, affine = null;
  if (header.spaceDirections) {
    headerAffine = nrrdAffine(header);
    affine = header.frame ? toRAS(headerAffine, header.frame) : headerAffine.slice();
  } else {
    affine = fromRows([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0]]);
  }
  return { header, volume: volume({ dims, data: values, affine, headerAffine, frame: header.frame, units: null }) };
}

// The bytes of a NRRD file (version 4) for a volume: raw, or gzip with a
// `deflate` function. The frame is written as the `space` given (RAS by default).
export function writeNrrd(vol, { encoding = 'raw', deflate, space = 'right-anterior-superior', keyValues = {} } = {}) {
  const Ctor = vol.data.constructor;
  const name = [...TYPES.entries()].find(([, c]) => c === Ctor);
  if (!name) throw new Error('unsupported data array');
  const A = vol.affine;
  const dirs = [0, 1, 2].map((c) => `(${A[c]},${A[4 + c]},${A[8 + c]})`).join(' ');
  const lines = [
    'NRRD0004', `type: ${name[0]}`, `dimension: ${vol.dims.length}`, `space: ${space}`, `sizes: ${vol.dims.join(' ')}`,
    `space directions: ${dirs}${vol.dims.length > 3 ? ' none'.repeat(vol.dims.length - 3) : ''}`,
    `kinds: ${vol.dims.map((_, i) => (i < 3 ? 'domain' : 'list')).join(' ')}`,
    `endian: ${PLATFORM_LITTLE ? 'little' : 'big'}`, `encoding: ${encoding}`, `space origin: (${A[3]},${A[7]},${A[11]})`,
    ...Object.entries(keyValues).map(([k, v]) => `${k}:=${v}`),
  ];
  const headerText = `${lines.join('\n')}\n\n`;
  const raw = new Uint8Array(vol.data.buffer, vol.data.byteOffset, vol.data.byteLength);
  const body = encoding === 'gzip' ? asBytes(deflate(raw)) : raw;
  const out = new Uint8Array(headerText.length + body.length);
  for (let i = 0; i < headerText.length; i++) out[i] = headerText.charCodeAt(i);
  out.set(body, headerText.length);
  return out;
}
