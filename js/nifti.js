// The NIfTI file format, versions 1 and 2, read from and written to bytes.
//
// NIfTI-1 (Cox et al. 2004; nifti1.h) is a 348-byte header followed, in a
// single .nii file, by the data at vox_offset (at least 352). NIfTI-2 (2011;
// nifti2.h) widens the fields to a 540-byte header. Both place the volume in
// the world by one of three methods (nifti1.h, "ORIENTATION AND LOCATION IN
// SPACE"):
//
//   method 1  qform_code = 0: x = pixdim[1] i, y = pixdim[2] j, z = pixdim[3] k;
//   method 2  qform_code > 0: a rotation R from the quaternion (b, c, d), with
//             a = sqrt(1 - b^2 - c^2 - d^2), and qfac = pixdim[0] = +-1:
//             (x, y, z) = R (pixdim[1] i, pixdim[2] j, qfac pixdim[3] k) + (qoffset_x, qoffset_y, qoffset_z);
//   method 3  sform_code > 0: (x, y, z) = srow_x . (i, j, k, 1), and so on.
//
// The world frame is RAS (x right, y anterior, z superior). The affine of a
// volume read here is the sform when sform_code > 0, else the qform when
// qform_code > 0, else method 1, as nibabel chooses. Field offsets and types
// follow nifti1.h and nifti2.h, retrieved from NIFTI-Imaging/nifti_clib on
// 2026-10-22.
//
// The reader takes bytes already in memory. A gzipped file (.nii.gz) is
// inflated by a function the caller passes (Node's zlib, or the browser's
// DecompressionStream), since the domain has no access to the system.
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { fromRows, voxelSizes, determinant3, invert } from './affine.js';
import { volume } from './volume.js';

// Data type codes (nifti1.h, NIFTI1_DATATYPES): the typed array and the bytes per voxel.
export const NIFTI_DATATYPES = {
  2: { name: 'uint8', array: Uint8Array, bytes: 1 },
  4: { name: 'int16', array: Int16Array, bytes: 2 },
  8: { name: 'int32', array: Int32Array, bytes: 4 },
  16: { name: 'float32', array: Float32Array, bytes: 4 },
  64: { name: 'float64', array: Float64Array, bytes: 8 },
  256: { name: 'int8', array: Int8Array, bytes: 1 },
  512: { name: 'uint16', array: Uint16Array, bytes: 2 },
  768: { name: 'uint32', array: Uint32Array, bytes: 4 },
  1024: { name: 'int64', array: BigInt64Array, bytes: 8 },
  1280: { name: 'uint64', array: BigUint64Array, bytes: 8 },
};
export const NIFTI_DATATYPE_CODES = Object.fromEntries(Object.entries(NIFTI_DATATYPES).map(([k, v]) => [v.name, Number(k)]));

// The meaning of qform_code and sform_code (nifti1.h, NIFTI1_XFORM_CODES).
export const NIFTI_XFORM = { 0: 'unknown', 1: 'scanner_anat', 2: 'aligned_anat', 3: 'talairach', 4: 'mni_152', 5: 'template_other' };

// xyzt_units: bits 0-2 the spatial unit, bits 3-5 the temporal (nifti1.h, NIFTI1_UNITS).
const SPACE_UNITS = { 0: null, 1: 'm', 2: 'mm', 3: 'um' };
const TIME_UNITS = { 0: null, 8: 's', 16: 'ms', 24: 'us', 32: 'Hz', 40: 'ppm', 48: 'rad/s' };

export const isGzip = (bytes) => bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

const asBytes = (b) => (b instanceof Uint8Array ? b : b instanceof ArrayBuffer ? new Uint8Array(b) : new Uint8Array(b.buffer, b.byteOffset, b.byteLength));
const text = (bytes, start, length) => {
  let s = '';
  for (let i = start; i < start + length && bytes[i] !== 0; i++) s += String.fromCharCode(bytes[i]);
  return s;
};

// The header, as an object of its fields; version 1 or 2 and the byte order
// are recognised from sizeof_hdr.
export function readNiftiHeader(input) {
  const bytes = asBytes(input);
  if (bytes.length < 348) throw new Error('too short for a NIfTI header');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let little = true, size = view.getInt32(0, true);
  if (size !== 348 && size !== 540) { little = false; size = view.getInt32(0, false); }
  if (size !== 348 && size !== 540) throw new Error('not a NIfTI header: sizeof_hdr is neither 348 nor 540');
  const version = size === 348 ? 1 : 2;
  if (version === 2 && bytes.length < 540) throw new Error('too short for a NIfTI-2 header');
  const i16 = (o) => view.getInt16(o, little), i32 = (o) => view.getInt32(o, little);
  const f32 = (o) => view.getFloat32(o, little), f64 = (o) => view.getFloat64(o, little);
  const i64 = (o) => Number(view.getBigInt64(o, little));
  const h = { version, littleEndian: little, sizeof_hdr: size };
  if (version === 1) {
    h.dim_info = bytes[39];
    h.dim = Array.from({ length: 8 }, (_, n) => i16(40 + 2 * n));
    h.intent_p1 = f32(56); h.intent_p2 = f32(60); h.intent_p3 = f32(64);
    h.intent_code = i16(68); h.datatype = i16(70); h.bitpix = i16(72); h.slice_start = i16(74);
    h.pixdim = Array.from({ length: 8 }, (_, n) => f32(76 + 4 * n));
    h.vox_offset = f32(108); h.scl_slope = f32(112); h.scl_inter = f32(116);
    h.slice_end = i16(120); h.slice_code = bytes[122]; h.xyzt_units = bytes[123];
    h.cal_max = f32(124); h.cal_min = f32(128); h.slice_duration = f32(132); h.toffset = f32(136);
    h.descrip = text(bytes, 148, 80); h.aux_file = text(bytes, 228, 24);
    h.qform_code = i16(252); h.sform_code = i16(254);
    h.quatern_b = f32(256); h.quatern_c = f32(260); h.quatern_d = f32(264);
    h.qoffset_x = f32(268); h.qoffset_y = f32(272); h.qoffset_z = f32(276);
    h.srow_x = [0, 1, 2, 3].map((n) => f32(280 + 4 * n));
    h.srow_y = [0, 1, 2, 3].map((n) => f32(296 + 4 * n));
    h.srow_z = [0, 1, 2, 3].map((n) => f32(312 + 4 * n));
    h.intent_name = text(bytes, 328, 16); h.magic = text(bytes, 344, 4);
  } else {
    h.magic = text(bytes, 4, 8);
    h.datatype = i16(12); h.bitpix = i16(14);
    h.dim = Array.from({ length: 8 }, (_, n) => i64(16 + 8 * n));
    h.intent_p1 = f64(80); h.intent_p2 = f64(88); h.intent_p3 = f64(96);
    h.pixdim = Array.from({ length: 8 }, (_, n) => f64(104 + 8 * n));
    h.vox_offset = i64(168); h.scl_slope = f64(176); h.scl_inter = f64(184);
    h.cal_max = f64(192); h.cal_min = f64(200); h.slice_duration = f64(208); h.toffset = f64(216);
    h.slice_start = i64(224); h.slice_end = i64(232);
    h.descrip = text(bytes, 240, 80); h.aux_file = text(bytes, 320, 24);
    h.qform_code = i32(344); h.sform_code = i32(348);
    h.quatern_b = f64(352); h.quatern_c = f64(360); h.quatern_d = f64(368);
    h.qoffset_x = f64(376); h.qoffset_y = f64(384); h.qoffset_z = f64(392);
    h.srow_x = [0, 1, 2, 3].map((n) => f64(400 + 8 * n));
    h.srow_y = [0, 1, 2, 3].map((n) => f64(432 + 8 * n));
    h.srow_z = [0, 1, 2, 3].map((n) => f64(464 + 8 * n));
    h.slice_code = i32(496); h.xyzt_units = i32(500); h.intent_code = i32(504);
    h.intent_name = text(bytes, 508, 16); h.dim_info = bytes[524];
  }
  if (!['n+1', 'ni1', 'n+2', 'ni2'].includes(h.magic.slice(0, 3))) throw new Error(`not a NIfTI header: magic "${h.magic}"`);
  const nd = Math.max(1, Math.min(7, h.dim[0]));
  h.dims = h.dim.slice(1, 1 + nd);
  while (h.dims.length < 3) h.dims.push(1);
  h.spacing = h.pixdim.slice(1, 4);
  h.qfac = h.pixdim[0] === -1 ? -1 : 1;
  h.units = { space: SPACE_UNITS[h.xyzt_units & 7] || null, time: TIME_UNITS[h.xyzt_units & 56] || null };
  h.datatypeName = (NIFTI_DATATYPES[h.datatype] || {}).name || null;
  return h;
}

// ---- the three methods --------------------------------------------------------------

// The rotation of a unit quaternion (a, b, c, d) with a >= 0 recovered from b,
// c, d (nifti1.h, "QUATERNION REPRESENTATION OF ROTATION MATRIX"), as 3 x 3 rows.
export function quaternionToMatrix(b, c, d) {
  const a = Math.sqrt(Math.max(0, 1 - (b * b + c * c + d * d)));
  return [
    [a * a + b * b - c * c - d * d, 2 * b * c - 2 * a * d, 2 * b * d + 2 * a * c],
    [2 * b * c + 2 * a * d, a * a + c * c - b * b - d * d, 2 * c * d - 2 * a * b],
    [2 * b * d - 2 * a * c, 2 * c * d + 2 * a * b, a * a + d * d - c * c - b * b],
  ];
}

// The nearest rotation to a 3 x 3 matrix M (rows), by the Newton iteration for
// the polar decomposition, P <- (P + P^-T) / 2 (Higham 1986), which nifti1_io.c
// uses as nifti_mat33_polar.
export function nearestRotation(M) {
  let P = M.map((r) => r.slice());
  for (let n = 0; n < 100; n++) {
    const inv = invert(fromRows(P));
    const Q = [0, 1, 2].map((r) => [0, 1, 2].map((c) => 0.5 * (P[r][c] + inv[4 * c + r])));
    let change = 0;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) change = Math.max(change, Math.abs(Q[r][c] - P[r][c]));
    P = Q;
    if (change < 1e-15) break;
  }
  return P;
}

// The quaternion (b, c, d), the voxel sizes, the offset and qfac of an affine,
// after nifti_mat44_to_quatern (nifti1_io.c): the columns' lengths are the
// voxel sizes; the normalised 3 x 3 part, with the third column reversed when
// its determinant is negative (qfac = -1), is brought to the nearest rotation,
// whose quaternion is read off with a >= 0.
export function matrixToQuaternion(A) {
  const sizes = voxelSizes(A);
  if (sizes.some((s) => s === 0)) throw new Error('a zero voxel size');
  let R = [0, 1, 2].map((r) => [0, 1, 2].map((c) => A[4 * r + c] / sizes[c]));
  const qfac = determinant3(fromRows(R)) < 0 ? -1 : 1;
  if (qfac < 0) R = R.map((row) => [row[0], row[1], -row[2]]);
  R = nearestRotation(R);
  const [[r11, r12, r13], [r21, r22, r23], [r31, r32, r33]] = R;
  let a = r11 + r22 + r33 + 1, b, c, d;
  if (a > 0.5) {
    a = 0.5 * Math.sqrt(a);
    b = 0.25 * (r32 - r23) / a; c = 0.25 * (r13 - r31) / a; d = 0.25 * (r21 - r12) / a;
  } else {
    const xd = 1 + r11 - (r22 + r33), yd = 1 + r22 - (r11 + r33), zd = 1 + r33 - (r11 + r22);
    if (xd > 1) {
      b = 0.5 * Math.sqrt(xd); c = 0.25 * (r12 + r21) / b; d = 0.25 * (r13 + r31) / b; a = 0.25 * (r32 - r23) / b;
    } else if (yd > 1) {
      c = 0.5 * Math.sqrt(yd); b = 0.25 * (r12 + r21) / c; d = 0.25 * (r23 + r32) / c; a = 0.25 * (r13 - r31) / c;
    } else {
      d = 0.5 * Math.sqrt(zd); b = 0.25 * (r13 + r31) / d; c = 0.25 * (r23 + r32) / d; a = 0.25 * (r21 - r12) / d;
    }
    if (a < 0) { b = -b; c = -c; d = -d; a = -a; }
  }
  return { a, b, c, d, qfac, sizes, offset: [A[3], A[7], A[11]] };
}

export const pixdimAffine = (h) => fromRows([[h.pixdim[1], 0, 0, 0], [0, h.pixdim[2], 0, 0], [0, 0, h.pixdim[3], 0]]);

export function qformAffine(h) {
  const R = quaternionToMatrix(h.quatern_b, h.quatern_c, h.quatern_d);
  const [sx, sy, sz] = [h.pixdim[1], h.pixdim[2], h.qfac * h.pixdim[3]];
  return fromRows([
    [R[0][0] * sx, R[0][1] * sy, R[0][2] * sz, h.qoffset_x],
    [R[1][0] * sx, R[1][1] * sy, R[1][2] * sz, h.qoffset_y],
    [R[2][0] * sx, R[2][1] * sy, R[2][2] * sz, h.qoffset_z],
  ]);
}

export const sformAffine = (h) => fromRows([h.srow_x, h.srow_y, h.srow_z]);

// The affine that places the volume, and which method gave it.
export function niftiAffine(h) {
  if (h.sform_code > 0) return { affine: sformAffine(h), method: 'sform', code: NIFTI_XFORM[h.sform_code] || h.sform_code };
  if (h.qform_code > 0) return { affine: qformAffine(h), method: 'qform', code: NIFTI_XFORM[h.qform_code] || h.qform_code };
  return { affine: pixdimAffine(h), method: 'pixdim', code: 'unknown' };
}

// ---- the data ---------------------------------------------------------------------------

const PLATFORM_LITTLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

function decode(bytes, offset, count, type, little) {
  const { array: Ctor, bytes: size } = type;
  const big = Ctor === BigInt64Array || Ctor === BigUint64Array;
  if (bytes.byteLength < offset + count * size) throw new Error(`the data is short: ${bytes.byteLength - offset} bytes for ${count} voxels of ${size}`);
  if (!big && little === PLATFORM_LITTLE && (bytes.byteOffset + offset) % size === 0) {
    return new Ctor(bytes.buffer, bytes.byteOffset + offset, count).slice();
  }
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

// A volume from the bytes of a .nii or .nii.gz file (with `inflate`), or of a
// .hdr file with the .img bytes as `image`. Integer data with a scaling
// (scl_slope not 0 or 1, or scl_inter not 0) are returned as float32 values
// slope * v + inter, as nibabel's get_fdata does, unless scale is false.
export function readNifti(input, { inflate, image, scale = true } = {}) {
  let bytes = asBytes(input);
  if (isGzip(bytes)) {
    if (!inflate) throw new Error('gzipped NIfTI: pass an inflate function');
    bytes = asBytes(inflate(bytes));
  }
  const header = readNiftiHeader(bytes);
  const type = NIFTI_DATATYPES[header.datatype];
  if (!type) throw new Error(`unsupported NIfTI datatype ${header.datatype}`);
  const count = header.dims.reduce((p, d) => p * d, 1);
  let source = bytes, offset = Math.round(header.vox_offset);
  if (image) { source = asBytes(image); if (isGzip(source)) source = asBytes(inflate(source)); }
  let data = decode(source, offset, count, type, header.littleEndian);
  const slope = header.scl_slope, inter = header.scl_inter;
  const scaled = scale && Number.isFinite(slope) && slope !== 0 && !(slope === 1 && inter === 0);
  if (scaled) {
    const out = data instanceof Float64Array ? data : new Float32Array(count);
    for (let n = 0; n < count; n++) out[n] = data[n] * slope + inter;
    data = out;
  }
  const { affine, method, code } = niftiAffine(header);
  return { header, volume: volume({ dims: header.dims, data, affine, units: header.units.space || 'mm', placedBy: method, xform: code, scaled }) };
}

// ---- writing ------------------------------------------------------------------------------

function typeOfData(data) {
  for (const [code, t] of Object.entries(NIFTI_DATATYPES)) if (data instanceof t.array) return Number(code);
  throw new Error('unsupported data array');
}

// The bytes of a single-file NIfTI (version 1, or 2 when asked) for a volume.
// The affine becomes both the sform (as it is) and the qform (its nearest
// rotation with the voxel sizes), with the transform code given (2, aligned
// anatomy, by default; 4 for MNI 152). Little-endian unless asked otherwise.
export function writeNifti(vol, { version = 1, xformCode = 2, descrip = '', littleEndian = true, intentCode = 0, intentName = '', scale = null } = {}) {
  const datatype = typeOfData(vol.data);
  const type = NIFTI_DATATYPES[datatype];
  const dims = vol.dims;
  const n = dims.reduce((p, d) => p * d, 1);
  const headerSize = version === 1 ? 348 : 540;
  const offset = version === 1 ? 352 : 544;
  const total = offset + n * type.bytes;
  const buffer = new ArrayBuffer(total);
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  const little = littleEndian;
  const q = matrixToQuaternion(vol.affine);
  const put = (at, s, max) => { for (let i = 0; i < Math.min(s.length, max); i++) bytes[at + i] = s.charCodeAt(i) & 0xff; };
  const pixdim = [q.qfac, q.sizes[0], q.sizes[1], q.sizes[2], 1, 1, 1, 1];
  const dim = [dims.length, ...dims, ...new Array(7 - dims.length).fill(1)];
  const rows = [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => vol.affine[4 * r + c]));
  const slope = scale ? scale.slope : (vol.scaleSlope ?? 1), inter = scale ? scale.inter : (vol.scaleInter ?? 0);
  if (version === 1) {
    view.setInt32(0, 348, little);
    dim.forEach((d, i) => view.setInt16(40 + 2 * i, d, little));
    view.setInt16(68, intentCode, little);
    view.setInt16(70, datatype, little); view.setInt16(72, type.bytes * 8, little);
    pixdim.forEach((p, i) => view.setFloat32(76 + 4 * i, p, little));
    view.setFloat32(108, offset, little); view.setFloat32(112, slope, little); view.setFloat32(116, inter, little);
    bytes[123] = 2;                                         // NIFTI_UNITS_MM
    put(148, descrip, 79);
    view.setInt16(252, xformCode, little); view.setInt16(254, xformCode, little);
    [q.b, q.c, q.d, ...q.offset].forEach((v, i) => view.setFloat32(256 + 4 * i, v, little));
    rows.forEach((row, r) => row.forEach((v, c) => view.setFloat32(280 + 16 * r + 4 * c, v, little)));
    put(328, intentName, 15);
    put(344, 'n+1', 3);
  } else {
    view.setInt32(0, 540, little);
    put(4, 'n+2', 3); bytes[8] = 0x0d; bytes[9] = 0x0a; bytes[10] = 0x1a; bytes[11] = 0x0a;
    view.setInt16(12, datatype, little); view.setInt16(14, type.bytes * 8, little);
    dim.forEach((d, i) => view.setBigInt64(16 + 8 * i, BigInt(d), little));
    pixdim.forEach((p, i) => view.setFloat64(104 + 8 * i, p, little));
    view.setBigInt64(168, BigInt(offset), little); view.setFloat64(176, slope, little); view.setFloat64(184, inter, little);
    put(240, descrip, 79);
    view.setInt32(344, xformCode, little); view.setInt32(348, xformCode, little);
    [q.b, q.c, q.d, ...q.offset].forEach((v, i) => view.setFloat64(352 + 8 * i, v, little));
    rows.forEach((row, r) => row.forEach((v, c) => view.setFloat64(400 + 32 * r + 8 * c, v, little)));
    view.setInt32(500, 2, little);                          // xyzt_units: mm
    view.setInt32(504, intentCode, little);
    put(508, intentName, 15);
  }
  // The data, in the file's byte order.
  const big = type.array === BigInt64Array || type.array === BigUint64Array;
  if (!big && little === PLATFORM_LITTLE) {
    new Uint8Array(buffer, offset, n * type.bytes).set(new Uint8Array(vol.data.buffer, vol.data.byteOffset, n * type.bytes));
  } else {
    const set = {
      1: (o, v) => (type.array === Int8Array ? view.setInt8(o, v) : view.setUint8(o, v)),
      2: (o, v) => (type.array === Int16Array ? view.setInt16(o, v, little) : view.setUint16(o, v, little)),
      4: (o, v) => (type.array === Int32Array ? view.setInt32(o, v, little) : type.array === Uint32Array ? view.setUint32(o, v, little) : view.setFloat32(o, v, little)),
      8: (o, v) => (type.array === Float64Array ? view.setFloat64(o, v, little) : type.array === BigInt64Array ? view.setBigInt64(o, v, little) : view.setBigUint64(o, v, little)),
    }[type.bytes];
    for (let i = 0; i < n; i++) set(offset + i * type.bytes, vol.data[i]);
  }
  void headerSize;
  return bytes;
}
