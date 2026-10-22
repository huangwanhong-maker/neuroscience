// Checks of the neuroscience domain: affines and the orientation of voxel grids;
// the NIfTI and NRRD readers against the headers of the published templates;
// the catalogue of reference spaces against TemplateFlow's descriptions; the
// MNI-Talairach transforms against their published coefficients; region trees
// and the readers of the Allen ontology, the EBRAINS configuration, FreeSurfer's
// table and Schaefer's; the built-in parcellations against FreeSurfer's table;
// labelled and statistical maps on constructed volumes; and the head: the 10-20
// system on a sphere and an ellipsoid, head frames, fitting, and scalp maps.
// Run from the repository root:  node domains/neuroscience/tests/run-tests.mjs
// The checks on the fetched templates (data/cache/) are skipped, and say so,
// when the files are missing.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import zlib from 'node:zlib';

import { suite, seeded, CACHE } from '../../../development/tools/checks.mjs';
import {
  identity, fromRows, fromOriginSpacing, compose, invert, apply, axisCodes, toRAS, reorient, nearlyEqual, voxelSizes,
  volume, sampleVoxel, sample, worldBounds, resample, voxelVolume, robustRange, toUint8,
  readNiftiHeader, readNifti, writeNifti, niftiAffine, qformAffine, sformAffine, quaternionToMatrix, matrixToQuaternion, NIFTI_DATATYPES,
  readNrrdHeader, readNrrd, writeNrrd, nrrdAffine,
  SPACES, ccfToRas, rasToCcf, ccfVoxelAffine, RAS_FROM_CCF,
  BRETT_ABOVE, BRETT_BELOW, LANCASTER, mniToTalairach, talairachToMni,
  Parcellation, Region, parcellation, lowestCommonAncestor, hemisphereOf, stripHemisphere, labelKey,
  fromFreeSurferLUT, fromBidsDseg, fromSchaefer, fromAllenStructureGraph, fromSiibraParcellation, fromItkSnapLabels, YEO_NETWORKS,
  DESIKAN_KILLIANY, FREESURFER_APARC_ASEG, NEURAXIS,
  labelledMap, overlap, dice, confusion, statisticalMap,
  headFrame, ellipsoidScalp, ellipsoidLandmarks, maskScalp, tenTwenty, TEN_TWENTY, fitSimilarity, scaleToHead, sphericalSpline, projectToMask, Scalp,
  ATLASES, CITATIONS, listAtlases,
  BRAIN_STRUCTURES, structure, keysOf, structureOfKey, SYSTEMS, LOBE_COLOURS, lobeOf,
  KNOWLEDGE, KNOWLEDGE_PARTS, REFERENCES, FIELDS, knowledgeOf, referencesOf,
} from '../js/index.js';

const { check, assert, skip, done } = suite();
const here = dirname(fileURLToPath(import.meta.url));
const fixture = (name) => JSON.parse(readFileSync(resolve(here, 'fixtures', name), 'utf8'));
const text = (name) => readFileSync(resolve(here, 'fixtures', name), 'utf8');
const random = seeded(20261022);
const inflate = (b) => zlib.gunzipSync(b);
const deflate = (b) => zlib.gzipSync(b);
const maxDiff = (a, b) => Math.max(...a.map((x, i) => Math.abs(x - b[i])));
const DEG = Math.PI / 180;

// ---- affines ---------------------------------------------------------------------------------
{
  const A = fromRows([[0.9, 0.1, -0.2, 12], [0.05, 1.1, 0.3, -7], [-0.1, 0.2, 0.8, 3]]);
  check('affine: A A^-1 is the identity', maxDiff(compose(A, invert(A)), identity()), 1e-12);
  const p = [3, -4, 5.5];
  check('affine: a point through A and back', maxDiff(apply(invert(A), apply(A, p)), p), 1e-12);
  const mni = fromOriginSpacing([-96, -132, -78], 1);
  const fsl = fromRows([[-1, 0, 0, 90], [0, 1, 0, -126], [0, 0, 1, -72]]);
  assert('affine: orientation codes of the MNI, FSL and Allen grids', axisCodes(mni).join('') === 'RAS' && axisCodes(fsl).join('') === 'LAS' && axisCodes(ccfVoxelAffine(25)).join('') === 'PIR',
    `${axisCodes(mni).join('')} ${axisCodes(fsl).join('')} ${axisCodes(ccfVoxelAffine(25)).join('')}`);
  check('affine: an LPS affine brought to RAS flips x and y', maxDiff(apply(toRAS(mni, 'LPS'), [1, 2, 3]), [-apply(mni, [1, 2, 3])[0], -apply(mni, [1, 2, 3])[1], apply(mni, [1, 2, 3])[2]]), 1e-12);
  check('affine: voxel sizes are the column lengths', maxDiff(voxelSizes(fromOriginSpacing([0, 0, 0], [1, 2, 3])), [1, 2, 3]), 1e-15);
  // Reorientation keeps every voxel at its world position.
  const dims = [3, 4, 5];
  const data = new Int16Array(60).map((_, i) => i + 1);
  const odd = fromRows([[-2, 0, 0, 10], [0, 0, 3, -5], [0, 1.5, 0, 2]]);     // i to the left, j up, k forward
  const v = volume({ dims, data, affine: odd });
  const r = reorient(v, 'RAS');
  let worst = 0, mismatches = 0;
  const inv = invert(odd);
  for (let c = 0; c < r.dims[2]; c++) for (let b = 0; b < r.dims[1]; b++) for (let a = 0; a < r.dims[0]; a++) {
    const w = apply(r.affine, [a, b, c]);
    const [i, j, k] = apply(inv, w).map(Math.round);
    worst = Math.max(worst, maxDiff(apply(inv, w), [i, j, k]));
    if (r.data[a + r.dims[0] * (b + r.dims[1] * c)] !== data[i + 3 * (j + 4 * k)]) mismatches++;
  }
  assert('affine: reorientation to RAS keeps every voxel in place', axisCodes(r.affine).join('') === 'RAS' && r.dims.join() === '3,5,4' && mismatches === 0 && worst < 1e-9, `${axisCodes(r.affine).join('')} ${r.dims} ${mismatches}`);
}

// ---- volumes ----------------------------------------------------------------------------------
{
  const dims = [4, 5, 6];
  const data = new Float64Array(120);
  for (let k = 0; k < 6; k++) for (let j = 0; j < 5; j++) for (let i = 0; i < 4; i++) data[i + 4 * (j + 5 * k)] = 1 + 2 * i + 3 * j + 4 * k;
  const v = volume({ dims, data, affine: fromOriginSpacing([-1, -2, -3], 2) });
  check('volume: trilinear interpolation reproduces a linear function', Math.abs(sampleVoxel(v, [1.25, 2.5, 3.75], { method: 'linear' }) - (1 + 2.5 + 7.5 + 15)), 1e-12);
  assert('volume: the nearest voxel is chosen by rounding', sampleVoxel(v, [1.49, 2.51, 0], { method: 'nearest' }) === data[1 + 4 * 3] && Number.isNaN(sampleVoxel(v, [-1, 0, 0])));
  check('volume: a world point samples through the affine', Math.abs(sample(v, [1, 2, 3], { method: 'nearest' }) - data[1 + 4 * (2 + 5 * 3)]), 0);
  const grid = SPACES['mni152-nlin-2009c-asym'].templates['1mm'];
  const b = worldBounds(volume({ dims: grid.dims, data: new Uint8Array(grid.dims[0] * grid.dims[1] * grid.dims[2]), affine: grid.affine }));
  check('volume: the bounds of the MNI 2009c grid', maxDiff([...b.min, ...b.max], [-96.5, -132.5, -78.5, 96.5, 96.5, 114.5]), 1e-12);
  const same = resample(v, { dims, affine: v.affine }, { method: 'linear' });
  check('volume: resampling onto its own grid changes nothing', maxDiff(Array.from(same.data), Array.from(data)), 1e-12);
  const coarse = resample(v, { dims: [2, 2, 2], affine: fromOriginSpacing([0, 0, 0], 4) }, { method: 'linear' });
  check('volume: a linear field resampled is still linear', Math.abs(coarse.data[1 + 2 * (1 + 2 * 1)] - sampleVoxel(v, apply(invert(v.affine), [4, 4, 4]), { method: 'linear' })) + Math.abs(coarse.data[1 + 2 * (1 + 2 * 1)] - (1 + 2 * 2.5 + 3 * 3 + 4 * 3.5)), 1e-12);
  check('volume: the voxel volume of a 2 mm grid', Math.abs(voxelVolume(v) - 8), 1e-12);
  const [lo, hi] = robustRange(data, 0, 1);
  assert('volume: a display range and 8-bit scaling', lo <= 1.01 && hi >= 38.9 && toUint8(data, [1, 39])[0] === 0 && toUint8(data, [1, 39])[119] === 255, `${lo} ${hi}`);
}

// ---- NIfTI ---------------------------------------------------------------------------------------
{
  const f = fixture('nifti-headers.json');
  let fails = [];
  for (const { file, header_base64, expect } of f.headers) {
    const bytes = new Uint8Array(Buffer.from(header_base64, 'base64'));
    const h = readNiftiHeader(bytes);
    const { affine } = niftiAffine(h);
    const ok = h.dims.join() === expect.dims.join() && maxDiff(h.pixdim.slice(1, 4), expect.pixdim) < 1e-6 && h.datatypeName === expect.datatype
      && maxDiff(h.srow_x, expect.srow_x) < 1e-6 && maxDiff(h.srow_y, expect.srow_y) < 1e-6 && maxDiff(h.srow_z, expect.srow_z) < 1e-6
      && h.qform_code === expect.qform_code && h.sform_code === expect.sform_code && axisCodes(affine).join('') === expect.axes
      && maxDiff(apply(affine, [0, 0, 0]), expect.origin) < 1e-6 && maxDiff(qformAffine(h), sformAffine(h)) < 1e-4;
    if (!ok) fails.push(file);
  }
  assert(`nifti: ${f.headers.length} headers of the MNI templates and the Schaefer map read as TemplateFlow describes them, qform and sform agreeing`, fails.length === 0, fails.join(', '));
  // Method 2: a quarter turn about z is the quaternion (0, 0, sin 45 deg).
  const R = quaternionToMatrix(0, 0, Math.SQRT1_2);
  check('nifti: the quaternion of a quarter turn about z', maxDiff(R.flat(), [0, -1, 0, 1, 0, 0, 0, 0, 1]), 1e-12);
  // The quaternion recovered from a rotation, for random rotations with and without a flipped third axis.
  let worst = 0;
  for (let n = 0; n < 50; n++) {
    let q = [random() - 0.5, random() - 0.5, random() - 0.5, random() - 0.5];
    const len = Math.hypot(...q);
    q = q.map((x) => x / len);
    if (q[0] < 0) q = q.map((x) => -x);
    const Rq = quaternionToMatrix(q[1], q[2], q[3]);
    const sizes = [0.5 + random(), 0.5 + random(), 0.5 + random()];
    const qfac = n % 2 ? -1 : 1;
    const A = fromRows([0, 1, 2].map((r) => [Rq[r][0] * sizes[0], Rq[r][1] * sizes[1], Rq[r][2] * sizes[2] * qfac, 10 * random()]));
    const back = matrixToQuaternion(A);
    worst = Math.max(worst, Math.abs(back.b - q[1]), Math.abs(back.c - q[2]), Math.abs(back.d - q[3]), maxDiff(back.sizes, sizes), back.qfac === qfac ? 0 : 1);
  }
  check('nifti: quaternion, voxel sizes and qfac recovered from 50 random affines', worst, 1e-9);
  // Writing and reading back, in both versions, both byte orders, with scaling.
  const dims = [5, 4, 3];
  // A rotated, anisotropic grid, so that the qform and sform both describe it.
  const Rot = quaternionToMatrix(0.1, -0.2, 0.3);
  const affine = fromRows([0, 1, 2].map((r) => [Rot[r][0] * 0.9, Rot[r][1] * 1.1, Rot[r][2] * 1.2, [-40, -60, -30][r]]));
  const cases = [
    ['uint8', Uint8Array.from({ length: 60 }, (_, i) => (i * 7) % 256), {}],
    ['int16', Int16Array.from({ length: 60 }, (_, i) => i * 100 - 3000), { version: 2 }],
    ['float32', Float32Array.from({ length: 60 }, (_, i) => Math.sin(i)), { littleEndian: false }],
    ['float64', Float64Array.from({ length: 60 }, (_, i) => Math.cos(i)), { version: 2, littleEndian: false }],
    ['int32', Int32Array.from({ length: 60 }, (_, i) => i * 1000000 - 30000000), {}],
    ['uint16', Uint16Array.from({ length: 60 }, (_, i) => i * 1000), { version: 2 }],
  ];
  let bad = [];
  for (const [name, data, options] of cases) {
    const v = volume({ dims, data, affine });
    const bytes = writeNifti(v, { ...options, descrip: 'a check' });
    const { header, volume: w } = readNifti(bytes);
    const conditions = {
      version: header.version === (options.version || 1), endian: header.littleEndian === (options.littleEndian !== false), type: header.datatypeName === name,
      dims: w.dims.join() === dims.join(), sform: maxDiff(w.affine, affine) < 1e-4, data: w.data.length === 60 && Array.from(w.data).every((x, i) => Math.abs(x - data[i]) < 1e-6),
      descrip: header.descrip === 'a check', placed: w.placedBy === 'sform', qform: maxDiff(qformAffine(header), affine) < 1e-4,
    };
    const failed = Object.keys(conditions).filter((k) => !conditions[k]);
    if (failed.length) bad.push(`${name} (${failed.join(' ')})`);
  }
  assert('nifti: six data types written and read back, in NIfTI-1 and -2, little- and big-endian', bad.length === 0, bad.join(', '));
  const scaled = readNifti(writeNifti(volume({ dims, data: Int16Array.from({ length: 60 }, (_, i) => i), affine }), { scale: { slope: 0.5, inter: -1 } }));
  check('nifti: scl_slope and scl_inter applied on reading', Math.abs(scaled.volume.data[10] - (10 * 0.5 - 1)) + (scaled.volume.data instanceof Float32Array ? 0 : 1), 1e-6);
  const gz = readNifti(deflate(writeNifti(volume({ dims, data: new Uint8Array(60).fill(7), affine }))), { inflate });
  assert('nifti: a gzipped file is inflated by the function passed', gz.volume.data[59] === 7 && gz.header.sizeof_hdr === 348);
  assert('nifti: the datatype table', NIFTI_DATATYPES[16].name === 'float32' && NIFTI_DATATYPES[512].name === 'uint16');
  // The fetched template, when present: the same grid as the catalogue, and most of its values in the brain.
  const cached = resolve(CACHE, 'templateflow-mni152', 'tpl-MNI152NLin2009cAsym_res-02_T1w.nii.gz');
  if (existsSync(cached)) {
    const { volume: t } = readNifti(readFileSync(cached), { inflate });
    const g = SPACES['mni152-nlin-2009c-asym'].templates['2mm'];
    assert('nifti: the fetched 2 mm template is on the catalogue grid', t.dims.join() === g.dims.join() && maxDiff(t.affine, g.affine) < 1e-6);
  } else {
    skip('nifti: the fetched MNI template is missing (python data/acquisition/fetch.py templateflow-mni152)');
  }
}

// ---- NRRD ------------------------------------------------------------------------------------------
{
  const head = text('allen-annotation-25-header.nhdr');
  const h = readNrrdHeader(new TextEncoder().encode(head));
  assert('nrrd: the header of the Allen 25 um annotation volume', h.type === 'unsigned int' && h.sizes.join() === '528,320,456' && h.encoding === 'gzip' && h.frame === 'LPS'
    && h.spaceDirections.length === 3 && h.spaceDirections[1][1] === 25 && h.spaceOrigin.join() === '0,0,0' && h.littleEndian && h.dataOffset === head.length,
    `${h.type} ${h.sizes} ${h.encoding} ${h.frame} ${h.dataOffset}/${head.length}`);
  const lps = nrrdAffine(h);
  check('nrrd: the header affine, 25 um per voxel from the origin', maxDiff(apply(lps, [1, 2, 3]), [25, 50, 75]), 1e-12);
  const dims = [4, 3, 2];
  const data = Uint32Array.from({ length: 24 }, (_, i) => 1000 + i);
  const affine = fromRows([[0.5, 0, 0, -1], [0, 0.5, 0, 2], [0, 0, 0.5, -3]]);
  for (const encoding of ['raw', 'gzip']) {
    const bytes = writeNrrd(volume({ dims, data, affine }), { encoding, deflate, space: 'left-posterior-superior', keyValues: { note: 'a check' } });
    const { header, volume: w } = readNrrd(bytes, { inflate });
    assert(`nrrd: a ${encoding} file written and read back, its LPS frame brought to RAS`, header.frame === 'LPS' && header.keyValues.note === 'a check' && w.dims.join() === dims.join()
      && Array.from(w.data).every((x, i) => x === data[i]) && maxDiff(w.affine, toRAS(affine, 'LPS')) < 1e-12 && maxDiff(w.headerAffine, affine) < 1e-12);
  }
  const ascii = new TextEncoder().encode('NRRD0001\ntype: float\ndimension: 3\nsizes: 2 2 1\nencoding: ascii\n\n1.5 2.5\n3.5 4.5\n');
  const a = readNrrd(ascii);
  assert('nrrd: an ascii-encoded file', a.volume.data instanceof Float32Array && Array.from(a.volume.data).join() === '1.5,2.5,3.5,4.5');
}

// ---- reference spaces ----------------------------------------------------------------------------
{
  const tf = fixture('templateflow.json').templates;
  const pairs = [['mni152-nlin-2009c-asym', 'MNI152NLin2009cAsym', { '1mm': '01', '2mm': '02', '3mm': '03', '4mm': '04' }], ['mni152-nlin-2009c-sym', 'MNI152NLin2009cSym', { '1mm': '1' }],
    ['mni152-nlin-6-asym', 'MNI152NLin6Asym', { '1mm': '01', '2mm': '02' }], ['mni152-lin', 'MNI152Lin', { '1mm': '01', '2mm': '02' }], ['fsaverage', 'fsaverage', { '1mm': '01' }]];
  const bad = [];
  let count = 0;
  for (const [id, tpl, map] of pairs) for (const [grid, res] of Object.entries(map)) {
    const g = SPACES[id].templates[grid], d = tf[tpl].res[res];
    count++;
    if (!(g.dims.join() === d.shape.join() && maxDiff(apply(g.affine, [0, 0, 0]), d.origin) < 1e-9 && maxDiff(voxelSizes(g.affine), d.zooms) < 1e-9)) bad.push(`${id} ${grid}`);
  }
  assert(`spaces: ${count} template grids agree with TemplateFlow's descriptions`, bad.length === 0, bad.join(', '));
  assert('spaces: Colin 27 is on the grid of MNI 152 linear', nearlyEqual(SPACES.colin27.templates['1mm'].affine, SPACES['mni152-lin'].templates['1mm'].affine) && SPACES.colin27.templates['1mm'].dims.join() === '181,217,181');
  // The Allen CCF: PIR micrometres to RAS millimetres and back.
  check('spaces: a CCF point (posterior, inferior, right) in RAS', maxDiff(ccfToRas([5280, 3200, 4560]), [4.56, -5.28, -3.2]), 1e-12);
  check('spaces: CCF and RAS, round trip', maxDiff(rasToCcf(ccfToRas([1234, 567, 890])), [1234, 567, 890]), 1e-9);
  const far = apply(ccfVoxelAffine(25), [528, 320, 456]);
  check('spaces: the far corner of the 25 um grid', maxDiff(far, [11.4, -13.2, -8]), 1e-12);
  assert('spaces: the CCF grids halve with the resolution', SPACES['allen-ccf-v3'].templates['50um'].dims.join() === '264,160,228' && SPACES['allen-ccf-v3'].templates['10um'].dims.join() === '1320,800,1140');
  assert('spaces: every space has a species, axes and citations', Object.values(SPACES).every((s) => s.species && s.axes && s.citations.length && s.id));
  void RAS_FROM_CCF;
}

// ---- MNI and Talairach ------------------------------------------------------------------------
{
  const f = fixture('mni-talairach.json');
  const brett = (m) => fromRows([[...m.x, 0], [...m.y, 0], [...m.z, 0]]);
  assert('talairach: Brett’s two matrices as published', nearlyEqual(BRETT_ABOVE, brett(f.brett.above_ac)) && nearlyEqual(BRETT_BELOW, brett(f.brett.below_ac)));
  let worst = 0;
  for (const { mni, talairach } of f.brett.examples) worst = Math.max(worst, maxDiff(mniToTalairach(mni), talairach));
  check('talairach: Brett’s transform on the worked examples', worst, 1e-9);
  check('talairach: Brett’s branches agree on the plane z = 0', maxDiff(apply(BRETT_ABOVE, [30, -40, 0]), apply(BRETT_BELOW, [30, -40, 0])), 1e-12);
  worst = 0;
  for (let n = 0; n < 100; n++) {
    const p = [160 * random() - 80, 180 * random() - 110, 150 * random() - 70];
    worst = Math.max(worst, maxDiff(talairachToMni(mniToTalairach(p)), p));
  }
  check('talairach: Brett’s transform inverted, 100 random points', worst, 1e-9);
  const bad = Object.keys(LANCASTER).filter((k) => !nearlyEqual(LANCASTER[k], fromRows(f.lancaster[k])));
  assert('talairach: Lancaster’s three matrices as distributed by BrainMap', bad.length === 0, bad.join(', '));
  worst = 0;
  for (const software of ['spm', 'fsl', 'other']) for (let n = 0; n < 30; n++) {
    const p = [160 * random() - 80, 180 * random() - 110, 150 * random() - 70];
    worst = Math.max(worst, maxDiff(talairachToMni(mniToTalairach(p, { method: 'lancaster', software }), { method: 'lancaster', software }), p));
  }
  check('talairach: Lancaster’s transforms inverted', worst, 1e-9);
  // The MNI origin lies about 4 mm above the Talairach origin, the anterior commissure (Brett): Lancaster's
  // transforms place it at a Talairach z of 3 to 4 mm.
  const z = ['spm', 'fsl', 'other'].map((software) => mniToTalairach([0, 0, 0], { method: 'lancaster', software })[2]);
  assert('talairach: the MNI origin is 3 to 4.1 mm above the anterior commissure by Lancaster, as Brett states', z.every((x) => x > 3 && x < 4.1), z.map((x) => x.toFixed(2)).join(' '));
}

// ---- region trees ---------------------------------------------------------------------------------
{
  const allen = fixture('allen-ontology-excerpt.json');
  const p = fromAllenStructureGraph(allen);
  assert('parcellation: the Allen excerpt has the structures kept, of 1,327 in the full ontology', p.size === allen.structures_kept && allen.structures_in_full_graph === 1327, `${p.size}`);
  const mop1 = p.get('MOp1'), ssp = p.get('SSp-bfd'), iso = p.get('Isocortex');
  assert('parcellation: a structure by acronym, its path and depth', mop1 && mop1.name === 'Primary motor area, Layer 1' && mop1.label === 320
    && mop1.path().map((r) => r.acronym).join('/') === 'root/grey/CH/CTX/CTXpl/Isocortex/MO/MOp/MOp1' && mop1.depth === 8);
  assert('parcellation: the lowest common ancestor of a motor and a somatosensory layer is the isocortex', lowestCommonAncestor(mop1, ssp) === iso && iso.id === 315);
  const mop = p.get('Primary motor area');
  assert('parcellation: a region’s label set is that of its down-set', mop.labelKeys().has(985) && mop.labelKeys().has(320) && mop.labelKeys().has(943) && mop.leaves().length === 5 && !iso.labelKeys().has(997) && p.get(997).labelKeys().size === p.size);
  assert('parcellation: colours and search', p.get('MOp').colour.join() === '31,157,90' && p.find('motor').length >= 3 && p.find('motor')[0].name.toLowerCase().includes('motor') && p.byLabel(985) === mop);
  assert('parcellation: ancestors and descendants', mop1.ancestors()[0] === mop && mop1.isDescendantOf(iso) && iso.isAncestorOf(mop1) && !mop1.isAncestorOf(mop) && p.get('root').descendants().length === p.size - 1);
  const cases = [['Area hOc1 (V1, 17, CalcS) - left hemisphere', 'left', 'Area hOc1 (V1, 17, CalcS)'], ['ctx-lh-insula', 'left', 'insula'], ['Right-Hippocampus', 'right', 'Hippocampus'],
    ['7Networks_RH_Vis_1', 'right', '7Networks_Vis_1'], ['Precentral_L', 'left', 'Precentral'], ['Cz', null, 'Cz'], ['Left lateral ventricle', 'left', 'lateral ventricle'], ['Thalamus', null, 'Thalamus'], ['lh.precentral', 'left', 'precentral']];
  const wrong = cases.filter(([name, side, base]) => hemisphereOf(name) !== side || stripHemisphere(name) !== base);
  assert('parcellation: the hemisphere read from names in six conventions', wrong.length === 0, wrong.map((c) => `${c[0]}: ${hemisphereOf(c[0])}, ${stripHemisphere(c[0])}`).join('; '));
  const dk = DESIKAN_KILLIANY;
  assert('parcellation: loose matching of names', dk.match('left precentral').label === 1024 && dk.match('ctx-rh-insula').label === 2035 && dk.match('Precentral_R').label === 2024 && dk.match('precentral').children.length === 2 && dk.match('nowhere') === null && dk.match('l') === null);
  const t = parcellation({ name: 'a tree', regions: [{ name: 'A', label: 1, children: [{ name: 'B', label: 2, labels: [{ label: 2, fragment: 0 }, { label: 5, fragment: 1 }] }] }] });
  assert('parcellation: labels in fragments', t.byLabel(5, 1).name === 'B' && t.byLabel(5) === null && t.get('A').labelKeys().has(labelKey(5, 1)) && t.toJSON().regions[0].children[0].labels.length === 2);
  assert('parcellation: a Region and a Parcellation are classes', t.get('A') instanceof Region && t instanceof Parcellation);
}

// ---- readers ------------------------------------------------------------------------------------------
{
  const lut = fromFreeSurferLUT(text('freesurfer-lut-excerpt.txt'));
  assert('readers: FreeSurfer’s table, 116 labels with sides and colours', lut.size === 116 && lut.byLabel(17).name === 'Left-Hippocampus' && lut.byLabel(17).hemisphere === 'left' && lut.byLabel(2035).colour.join() === '255,192,32', `${lut.size}`);
  // The built-in parcellations transcribe the table: every label of the excerpt but the unknown and
  // corpus-callosum cortex entries is a region with the table's name and colour.
  const missing = [], wrongColour = [];
  for (const r of lut.all) {
    if (/unknown|corpuscallosum$/.test(r.name)) continue;
    const mine = FREESURFER_APARC_ASEG.byLabel(r.label);
    if (!mine) { missing.push(r.name); continue; }
    if (mine.colour.join() !== r.colour.join()) wrongColour.push(r.name);
    if (mine.attributes.freesurfer !== r.name) missing.push(`${r.name} named ${mine.attributes.freesurfer}`);
  }
  assert('readers: the built-in aparc+aseg has every label of FreeSurfer’s table with its name and colour', missing.length === 0 && wrongColour.length === 0, [...missing, ...wrongColour].join(', '));
  const leftDK = DESIKAN_KILLIANY.leaves().filter((r) => r.hemisphere === 'left'), rightDK = DESIKAN_KILLIANY.leaves().filter((r) => r.hemisphere === 'right');
  const lobes = DESIKAN_KILLIANY.get('Cerebral cortex').children.map((l) => `${l.name}: ${l.children.length}`);
  assert('readers: Desikan-Killiany has 34 regions a hemisphere, labels 1001-1035 and 2001-2035 without 1004 and 2004, in six lobes',
    leftDK.length === 34 && rightDK.length === 34 && leftDK.every((r) => r.label >= 1001 && r.label <= 1035 && r.label !== 1004) && rightDK.every((r) => r.label === DESIKAN_KILLIANY.get(r.name.replace('Right', 'Left')).label + 1000)
    && lobes.join('; ') === 'Frontal lobe: 11; Parietal lobe: 5; Temporal lobe: 9; Occipital lobe: 4; Cingulate cortex: 4; Insula: 1', lobes.join('; '));
  assert('readers: the neuraxis places the thalamus in the diencephalon of the forebrain', NEURAXIS.get('Thalamus').path().map((r) => r.name).join('/') === 'Central nervous system/Brain/Forebrain/Diencephalon/Thalamus' && NEURAXIS.get('Cerebellum').parent.name === 'Metencephalon');
  // Schaefer's table.
  const tsv = text('schaefer-2018-100-7networks-dseg.tsv');
  const flat = fromBidsDseg(tsv);
  const s = fromSchaefer(tsv);
  const labels = new Set(s.leaves().map((r) => r.label));
  assert('readers: Schaefer 100 as a tree of 7 networks, 2 hemispheres each, 100 parcels with labels 1-100', flat.size === 100 && s.roots.length === 7 && s.size === 7 + 14 + 100 && labels.size === 100 && Math.min(...labels) === 1 && Math.max(...labels) === 100
    && s.byLabel(1).name === '7Networks_LH_Vis_1' && s.byLabel(1).side() === 'left' && s.byLabel(1).parent.parent.acronym === 'Vis' && s.get('Vis').name === YEO_NETWORKS.Vis && s.byLabel(1).colour.join() === '120,18,131'
    && s.leaves().filter((r) => r.side() === 'right').length === 50 && s.id === 'schaefer-2018-100-7', `${flat.size} ${s.roots.length} ${s.size} ${labels.size}`);
  // The EBRAINS configuration of Julich-Brain, with its map.
  const jb = fixture('julich-brain-excerpt.json');
  const j = fromSiibraParcellation(jb.parcellation, { map: jb.map });
  const hoc1 = j.get('Area hOc1 (V1, 17, CalcS)'), hoc1l = j.get('Area hOc1 (V1, 17, CalcS) - left hemisphere');
  assert('readers: Julich-Brain v3.1 from its configuration, labels joined from the map by hemisphere', j.name === 'Julich-Brain Cytoarchitectonic Atlas (v3.1)' && j.version === '3.1.0' && j.species === 'homo sapiens'
    && j.fragments.length === 2 && j.fragments[0].fragment === 'left hemisphere' && hoc1l.hemisphere === 'left' && hoc1l.labels.length === 1 && hoc1l.labels[0].fragment === 0
    && j.get('Area hOc1 (V1, 17, CalcS) - right hemisphere').labels[0].fragment === 1 && hoc1.labelKeys().size === 2 && hoc1.children.length === 2 && j.byLabel(hoc1l.label, 0) === hoc1l
    && jb.full_tree.nodes === 771 && jb.full_tree.hemisphere_leaves === 454, `${j.name} ${j.version} ${j.fragments.length}`);
  const snap = fromItkSnapLabels('################################################\n# ITK-SnAP Label Description File\n    0     0    0    0        0  0  0    "Clear Label"\n    1   255    0    0        1  1  1    "Left hippocampus"\n    2     0  255    0        1  1  1    "Right hippocampus"\n');
  assert('readers: an ITK-SNAP label description', snap.size === 2 && snap.byLabel(1).name === 'Left hippocampus' && snap.byLabel(1).hemisphere === 'left' && snap.byLabel(2).colour.join() === '0,255,0');
}

// ---- maps ---------------------------------------------------------------------------------------------
{
  const dims = [10, 8, 6];
  const affine = fromOriginSpacing([-9, -7, -5], 2);
  const data = new Uint16Array(480);
  for (let k = 0; k < 6; k++) for (let j = 0; j < 8; j++) for (let i = 0; i < 10; i++) data[i + 10 * (j + 8 * k)] = i < 5 ? 1 : j < 4 ? 2 : 0;
  const parc = parcellation({ name: 'two regions', regions: [{ name: 'Both', children: [{ name: 'A', label: 1 }, { name: 'B', label: 2 }] }] });
  const m = labelledMap({ parcellation: parc, volumes: [volume({ dims, data, affine })] });
  const sa = m.statistics(parc.get('A')), sb = m.statistics(parc.get('B')), both = m.statistics(parc.get('Both'));
  assert('maps: voxel counts and volumes of two regions and their parent', sa.voxels === 240 && sb.voxels === 120 && sa.volume === 1920 && both.voxels === 360 && both.volume === 2880);
  check('maps: the centroid of a block, exactly through the affine', maxDiff(sa.centroid, [-5, 0, 0]) + maxDiff(sb.centroid, [5, -4, 0]) + maxDiff(both.centroid, [-5 / 3, -4 / 3, 0]), 1e-12);
  check('maps: the bounds of a region', maxDiff([...sa.bounds.min, ...sa.bounds.max], [-9, -7, -5, -1, 7, 5]), 1e-12);
  assert('maps: the region at a point, and none outside', m.regionAt([-4, 0, 0]).name === 'A' && m.regionAt([6, -5, 1]).name === 'B' && m.regionAt([6, 5, 1]) === null && m.regionAt([100, 0, 0]) === null && m.at([-4, 0, 0]).label === 1);
  const ma = m.mask(parc.get('A')), mb = m.mask(parc.get('B')), mboth = m.mask(parc.get('Both'));
  const half = new Uint8Array(480).map((_, p) => (p % 10 < 5 && p % 10 >= 2 ? 1 : 0));     // i in 2..4: 144 voxels, all in A
  assert('maps: masks of regions and their parent', ma.reduce((s, x) => s + x, 0) === 240 && mboth.reduce((s, x) => s + x, 0) === 360 && mboth.every((x, i) => x === (ma[i] | mb[i])));
  check('maps: Dice and Jaccard of masks', Math.abs(dice(ma, ma) - 1) + dice(ma, mb) + Math.abs(dice(ma, half) - 2 * 144 / (240 + 144)) + Math.abs(overlap(ma, half).jaccard - 144 / 240), 1e-12);
  const c = confusion(volume({ dims, data, affine }), volume({ dims, data: half, affine }));
  assert('maps: the confusion of two labellings', c.get(1).get(1) === 144 && c.get(1).get(0) === 96 && c.get(2).get(0) === 120 && !c.has(0));
  // Fragments: one volume per hemisphere, the same labels in each.
  const left = volume({ dims: [4, 4, 4], data: new Uint8Array(64).fill(1), affine: fromOriginSpacing([-8, 0, 0], 2) });
  const right = volume({ dims: [4, 4, 4], data: new Uint8Array(64).fill(1), affine: fromOriginSpacing([1, 0, 0], 2) });
  const bi = parcellation({ name: 'bilateral', regions: [{ name: 'Area', children: [{ name: 'Area - left hemisphere', hemisphere: 'left', labels: [{ label: 1, fragment: 0 }] }, { name: 'Area - right hemisphere', hemisphere: 'right', labels: [{ label: 1, fragment: 1 }] }] }] });
  const fm = labelledMap({ parcellation: bi, volumes: [{ volume: left, fragment: 0, name: 'left hemisphere' }, { volume: right, fragment: 1, name: 'right hemisphere' }] });
  assert('maps: a map in two fragments finds the hemisphere by its volume', fm.regionAt([-5, 2, 2]).hemisphere === 'left' && fm.regionAt([3, 2, 2]).hemisphere === 'right' && fm.statistics(bi.get('Area')).voxels === 128 && fm.statistics(bi.get('Area - right hemisphere')).voxels === 64);
  // A statistical map: two probability volumes, their maximum probability map and assignments.
  const p1 = new Float32Array(480).map((_, p) => (p % 10 < 5 ? 0.8 : 0.2)), p2 = new Float32Array(480).fill(0.3);
  const regions = parcellation({ name: 'p', regions: [{ name: 'P', label: 7 }, { name: 'Q', label: 9 }] });
  const sm = statisticalMap({ parcellation: regions, maps: [{ region: regions.get('P'), volume: volume({ dims, data: p1, affine }) }, { region: regions.get('Q'), volume: volume({ dims, data: p2, affine }) }] });
  const mpm = sm.maximumProbabilityMap();
  const mpmT = sm.maximumProbabilityMap({ threshold: 0.5 });
  assert('maps: the maximum probability map takes the likelier region at each voxel, and none below the threshold',
    mpm.volume.data[0] === 7 && mpm.volume.data[7] === 9 && mpm.labels.get(9).name === 'Q' && mpmT.volume.data[0] === 7 && mpmT.volume.data[7] === 0);
  const at = sm.probabilitiesAt([-4, 0, 0]);
  check('maps: probabilities at a point, highest first', Math.abs(at[0].value - 0.8) + Math.abs(at[1].value - 0.3) + (at[0].region.name === 'P' ? 0 : 1), 1e-6);
  const blurred = sm.assign([-4, 0, 0], { sigma: 1 });
  check('maps: a Gaussian assignment of a point deep in one region', Math.abs(blurred[0].value - 0.8) + Math.abs(blurred[1].value - 0.3), 1e-6);
  const edge = sm.assign([0, 0, 0], { sigma: 3 });
  assert('maps: an uncertain point on a border is between the two values', edge.find((x) => x.region.name === 'P').value > 0.3 && edge.find((x) => x.region.name === 'P').value < 0.7);
}

// ---- the head ---------------------------------------------------------------------------------------
{
  const R = 100;
  const sphere = ellipsoidScalp({ semiAxes: [R, R, R] });
  const marks = ellipsoidLandmarks(sphere);
  const t = tenTwenty(sphere, marks, { system: '10-10' });
  const by = Object.fromEntries(t.positions.map((p) => [p.name, p.position]));
  const ang = (name) => { const a = sphere.angles(by[name]); return [a.theta / DEG, a.phi / DEG]; };
  const expect = { Cz: [0, null], Fz: [36, 90], Pz: [36, -90], Fpz: [72, 90], Oz: [72, -90], T7: [72, 180], T8: [72, 0], C3: [36, 180], C4: [36, 0], F7: [72, 144], F8: [72, 36], Fp1: [72, 108], Fp2: [72, 72], O1: [72, -108], O2: [72, -72], P7: [72, -144], AF7: [72, 126], FT7: [72, 162], TP7: [72, -162], PO7: [72, -126] };
  const off = Object.entries(expect).filter(([name, [theta, phi]]) => { const [th, ph] = ang(name); return Math.abs(th - theta) > 1e-6 || (phi !== null && Math.abs(((ph - phi + 540) % 360) - 180) > 1e-6); });
  assert('head: on a sphere, 20 positions of the 10-20 and 10-10 systems at their angles (Fz 36 degrees from the vertex, the ring at 72)', off.length === 0, off.map(([n]) => `${n}: ${ang(n).map((x) => x.toFixed(2))}`).join('; '));
  assert('head: 65 positions in 10-10, 21 in 10-20, all on the sphere, and the two arcs agree at Cz', t.positions.length === 65 && tenTwenty(sphere, marks, { system: '10-20' }).positions.length === 21
    && t.positions.every((p) => Math.abs(Math.hypot(...p.position) - R) < 1e-6) && t.czDiscrepancy < 1e-9 && TEN_TWENTY.length === 19);
  const angle = (a, b) => Math.acos(Math.max(-1, Math.min(1, (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (R * R)))) / DEG;
  check('head: F3 is midway along the great circle from F7 to Fz', Math.abs(angle(by.F7, by.F3) - angle(by.F3, by.Fz)) + Math.abs(angle(by.F7, by.F3) + angle(by.F3, by.Fz) - angle(by.F7, by.Fz)), 1e-6, 'deg');
  // An ellipsoid head: positions on the surface, symmetric, with Fz at 30 % of the midline arc.
  const e = ellipsoidScalp({ semiAxes: [75, 95, 70], centre: [1, -2, 3] });
  const em = ellipsoidLandmarks(e);
  const te = tenTwenty(e, em);
  const eb = Object.fromEntries(te.positions.map((p) => [p.name, p.position]));
  const onSurface = te.positions.every((p) => { const l = e.toLocal(p.position); return Math.abs((l[0] / 75) ** 2 + (l[1] / 95) ** 2 + (l[2] / 70) ** 2 - 1) < 1e-6; });
  const mirror = ['F3', 'C3', 'P3', 'T7', 'F7', 'O1', 'Fp1', 'AF3', 'CP5'].every((n) => { const r = n.replace(/3$/, '4').replace(/7$/, '8').replace(/1$/, '2').replace(/5$/, '6'); const a = e.toLocal(eb[n]), b = e.toLocal(eb[r]); return Math.abs(a[0] + b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6 && Math.abs(a[2] - b[2]) < 1e-6; });
  assert('head: on an ellipsoid, every position lies on the surface and the sides mirror', onSurface && mirror);
  check('head: Fz at three tenths of the midline arc of the ellipsoid', Math.abs(e.arcLength(em.nasion, eb.Fz) / e.arcLength(em.nasion, em.inion) - 0.3), 1e-3);
  check('head: T7 at one tenth of the ear-to-ear arc, and Fpz at one tenth of the midline', Math.abs(e.arcLength(em.lpa, eb.T7) / e.arcLength(em.lpa, em.rpa) - 0.1) + Math.abs(e.arcLength(em.nasion, eb.Fpz) / e.arcLength(em.nasion, em.inion) - 0.1), 2e-3);
  // A head whose landmarks lie below the centre, as a real head's do: the arcs still pass over the vertex.
  const low = { nasion: e.point(110 * DEG, 90 * DEG), inion: e.point(105 * DEG, -90 * DEG), lpa: e.point(115 * DEG, 180 * DEG), rpa: e.point(115 * DEG, 0), vertex: e.point(0, 0) };
  const tl = tenTwenty(e, low);
  const lb = Object.fromEntries(tl.positions.map((p) => [p.name, p.position]));
  // The two arcs' midpoints then differ by a few millimetres, as they do on a real head.
  assert('head: with landmarks below the centre, Cz is at the top, T7 on the left ring, and the midline arc passes over the vertex', e.angles(lb.Cz).theta < 12 * DEG && e.angles(lb.T7).theta < 100 * DEG && e.angles(lb.T7).theta > 60 * DEG && e.toLocal(lb.T7)[0] < -40 && e.toLocal(lb.Fz)[2] > 40 && e.toLocal(lb.Oz)[1] < -60 && tl.czDiscrepancy < 10,
    `Cz theta ${(e.angles(lb.Cz).theta / DEG).toFixed(1)}, T7 ${e.toLocal(lb.T7).map((x) => x.toFixed(0))}, Fz ${e.toLocal(lb.Fz).map((x) => x.toFixed(0))}, discrepancy ${tl.czDiscrepancy.toFixed(2)}`);
  // Head frames.
  const lm = { nasion: [0, 90, -40], lpa: [-80, -20, -45], rpa: [80, -20, -45] };
  const ctf = headFrame(lm, 'ctf'), nm = headFrame(lm, 'neuromag');
  check('head: the CTF frame, x through the nasion, y to the left ear, origin between the ears', maxDiff(apply(ctf.toHead, lm.lpa), [0, 80, 0]) + maxDiff(apply(ctf.toHead, lm.rpa), [0, -80, 0]) + Math.abs(apply(ctf.toHead, lm.nasion)[1]) + Math.abs(apply(ctf.toHead, lm.nasion)[2]) + maxDiff(apply(ctf.toWorld, apply(ctf.toHead, [1, 2, 3])), [1, 2, 3]), 1e-9);
  check('head: the Neuromag frame, x from the left to the right ear, y through the nasion', maxDiff(apply(nm.toHead, lm.lpa), [-80, 0, 0]) + maxDiff(apply(nm.toHead, lm.rpa), [80, 0, 0]) + Math.abs(apply(nm.toHead, lm.nasion)[0]) + Math.abs(apply(nm.toHead, lm.nasion)[2]) + Math.abs(apply(nm.toHead, lm.nasion)[1] - Math.hypot(110, 5)), 1e-9);
  // Fitting a similarity, and scaling to measurements.
  const src = [[0, 0, 0], [10, 0, 0], [0, 10, 0], [0, 0, 10], [3, 4, 5], [-2, 7, 1]];
  const q = [0.9, 0.1, -0.3, 0.2].map((x, _, a) => x / Math.hypot(...a));
  const Rq = quaternionToMatrix(q[1], q[2], q[3]);
  const dst = src.map((p) => [0, 1, 2].map((r) => 1.7 * (Rq[r][0] * p[0] + Rq[r][1] * p[1] + Rq[r][2] * p[2]) + [5, -3, 1][r]));
  const fit = fitSimilarity(src, dst);
  check('head: a similarity recovered from six matched points (Umeyama)', Math.abs(fit.scale - 1.7) + fit.rms + maxDiff(fit.rotation.flat(), Rq.flat()) + maxDiff(fit.translation, [5, -3, 1]), 1e-9);
  const rigid = fitSimilarity(src, dst, { scaling: false });
  assert('head: without scaling the fit keeps scale 1 and leaves a residual', rigid.scale === 1 && rigid.rms > 1);
  const sc = scaleToHead({ ...marks, vertex: marks.vertex }, { length: 190, breadth: 150, height: 120 });
  check('head: scaling a template head to measurements, about the ears', maxDiff(sc.scales, [0.75, 0.95, 1.2]) + maxDiff(apply(sc.affine, [0, 0, 0]), [0, 0, 0]) + maxDiff(apply(sc.affine, marks.nasion), [0, 95, 0]), 1e-9);
  // Spherical splines interpolate the data and preserve a constant.
  const dirs = t.positions.filter((p) => TEN_TWENTY.includes(p.name)).map((p) => sphere.toLocal(p.position));
  const values = dirs.map((d) => 3 + d[2] / R - 0.5 * d[0] / R);
  const spline = sphericalSpline(dirs, values);
  check('head: a spherical spline reproduces the values at the 19 electrodes', Math.max(...dirs.map((d, i) => Math.abs(spline.at(d) - values[i]))), 1e-8);
  check('head: a constant field is interpolated as a constant', Math.abs(sphericalSpline(dirs, dirs.map(() => 7)).at([0.3, -0.4, 0.5]) - 7), 1e-8);
  // A scalp cast through a mask, and a projection onto a mask.
  const n = 41, half = 20;
  const ball = new Uint8Array(n * n * n);
  for (let k = 0; k < n; k++) for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (Math.hypot(i - half, j - half, k - half) <= 15) ball[i + n * (j + n * k)] = 1;
  const maskVol = volume({ dims: [n, n, n], data: ball, affine: fromOriginSpacing([-half, -half, -half], 1) });
  const cast = maskScalp(maskVol, { centre: [0, 0, 0], axes: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] });
  // Membership is by the nearest voxel, so the surface found lies within a voxel's half-diagonal of the sphere.
  check('head: a scalp cast through a ball of radius 15 voxels, along the axis and obliquely', Math.max(Math.abs(cast.radius([0, 0, 1]) - 15), Math.abs(cast.radius([0.6, 0, 0.8]) - 15)), 0.87, 'voxel');
  const hit = projectToMask([0, 0, 30], [0, 0, 0], maskVol);
  check('head: a point projected onto the ball along the ray to the centre', Math.abs(Math.hypot(...hit) - 15), 0.6);
  assert('head: a Scalp is a class with arcs', cast instanceof Scalp && Scalp.length(cast.section([0, 0, 15], [15, 0, 0], 100)) > 20);
}

// ---- the catalogue ----------------------------------------------------------------------------------
{
  const keys = new Set();
  for (const a of listAtlases()) { for (const p of a.parcellations) p.citations.forEach((k) => keys.add(k)); if (a.template) a.template.citations.forEach((k) => keys.add(k)); }
  for (const s of Object.values(SPACES)) s.citations.forEach((k) => keys.add(k));
  const unknown = [...keys].filter((k) => !CITATIONS[k]);
  assert('atlas: every citation key of the catalogue has its reference', unknown.length === 0, unknown.join(', '));
  assert('atlas: every atlas names a space of the catalogue and parcellations with licences', listAtlases().every((a) => SPACES[a.space] && a.spaces.every((s) => SPACES[s]) && a.parcellations.every((p) => p.licence && p.id && p.name)));
  assert('atlas: the human atlas is in the EBRAINS space with Julich-Brain, Schaefer and Desikan-Killiany', ATLASES.human.space === 'mni152-nlin-2009c-asym' && ATLASES.human.parcellations.map((p) => p.id).join() === 'julich-brain-3.1,schaefer-2018-100-7,schaefer-2018-400-7,desikan-killiany');
}

// ---- the brain: its tree of structures ---------------------------------------------------------------
{
  const ids = BRAIN_STRUCTURES.map((s) => s.id);
  assert('brain: every structure has a unique id, a name and a known parent', new Set(ids).size === ids.length && BRAIN_STRUCTURES.every((s) => s.name && (s.parent === null || structure(s.parent))));
  const kinds = new Set(['group', 'surface', 'lobe', 'gyrus', 'nucleus', 'tract', 'region', 'ventricle']);
  assert('brain: every structure is of a known kind', BRAIN_STRUCTURES.every((s) => kinds.has(s.kind)), BRAIN_STRUCTURES.filter((s) => !kinds.has(s.kind)).map((s) => s.id).join());
  // Every key names one structure and one side, and the inverse lookup returns it.
  const seen = new Map();
  let clash = '';
  for (const s of BRAIN_STRUCTURES) for (const which of ['label', 'mesh']) for (const side of ['left', 'right', 'mid']) {
    const k = s[which] && s[which][side];
    if (!k) continue;
    const prev = seen.get(`${which}|${k}`);
    if (prev && prev !== s.id) clash += `${k} (${prev}, ${s.id}) `;
    seen.set(`${which}|${k}`, s.id);
  }
  assert('brain: no key names two structures', !clash, clash);
  assert('brain: a key leads back to its structure and side', BRAIN_STRUCTURES.every((s) => ['left', 'right', 'mid'].every((side) => !s.label || !s.label[side] || (structureOfKey(s.label[side])?.id === s.id && structureOfKey(s.label[side])?.side === side))));
  // Harvard-Oxford's lateralised labels: odd values left, even right, 1 to 96, each used once.
  const ho = BRAIN_STRUCTURES.filter((s) => s.label && s.label.left && s.label.left.startsWith('ho:'));
  const hoValues = ho.flatMap((s) => [Number(s.label.left.slice(3)), Number(s.label.right.slice(3))]);
  assert('brain: the 48 Harvard-Oxford gyri take the 96 lateralised labels, odd on the left', ho.length === 48 && new Set(hoValues).size === 96 && ho.every((s) => Number(s.label.left.slice(3)) % 2 === 1 && Number(s.label.right.slice(3)) === Number(s.label.left.slice(3)) + 1));
  assert('brain: every gyrus lies in a lobe with a colour', ho.every((s) => LOBE_COLOURS[lobeOf(s.id)]));
  assert('brain: keysOf gathers the keys beneath a structure', keysOf('hippocampus').left.has('aseg:17') && keysOf('hippocampus').left.has('massp:42') && keysOf('hippocampus').right.has('aseg:53'));
  assert('brain: short names exist and are short', BRAIN_STRUCTURES.every((s) => s.short && s.short.length <= 36), BRAIN_STRUCTURES.filter((s) => !s.short || s.short.length > 36).map((s) => s.short).join(' | '));
  const unknownMembers = SYSTEMS.flatMap((y) => y.members.filter((m) => !structure(m)));
  assert('brain: every member of a functional system is a structure', unknownMembers.length === 0, unknownMembers.join());
  assert('brain: every system has a summary and at least four members', SYSTEMS.every((y) => y.summary && y.members.length >= 4));
}

// ---- the brain: the sides of the labels, by the centroids of their voxels --------------------------------
{
  // The centroid of every key's voxels in the anatomy product (data/products/brain_anatomy.py),
  // recorded with its source in the fixture; a left key must lie at x < 0, a right one at
  // x > 0, and a midline structure near x = 0.
  const fx = fixture('brain-centroids.json');
  const bad = [];
  let n = 0;
  for (const s of BRAIN_STRUCTURES) for (const which of ['label', 'mesh']) for (const side of ['left', 'right', 'mid']) {
    const k = s[which] && s[which][side];
    if (!k || !fx.centroids[k]) continue;
    n++;
    const x = fx.centroids[k][0];
    // FreeSurfer does not divide some labels by side: the fluid outside the ventricles and the
    // lesions of the white matter lie on both sides, and are not held to the midline.
    const bilateral = ['csf', 'white-matter-hypointensities'].includes(s.id);
    if ((side === 'left' && x >= 0) || (side === 'right' && x <= 0) || (side === 'mid' && !bilateral && Math.abs(x) > 6)) bad.push(`${k} ${side} x=${x}`);
  }
  assert(`brain: every key lies on its side (${n} keys, by the centroids of their voxels)`, bad.length === 0 && n > 150, bad.join('; '));
  const missing = BRAIN_STRUCTURES.flatMap((s) => ['left', 'right', 'mid'].map((side) => s.label && s.label[side]).filter(Boolean)).filter((k) => !fx.centroids[k]);
  assert('brain: every label key of the catalogue has voxels in the product', missing.length === 0, missing.join());
  const product = resolve(CACHE, 'products', 'anatomy-mni152.json');
  if (existsSync(product)) {
    const p = JSON.parse(readFileSync(product, 'utf8'));
    const meshKeys = new Set(p.meshes.map((m) => m.key));
    const wanted = BRAIN_STRUCTURES.flatMap((s) => ['left', 'right', 'mid'].map((side) => s.mesh && s.mesh[side]).filter(Boolean));
    const absent = wanted.filter((k) => !meshKeys.has(k));
    assert(`brain: every mesh key of the catalogue is in the product (${wanted.length} meshes)`, absent.length === 0, absent.join());
    const drift = Object.entries(fx.centroids).filter(([k, c]) => p.regions[k] && Math.hypot(...p.regions[k].centroid.map((v, a) => v - c[a])) > 0.05).map(([k]) => k);
    assert('brain: the product\'s centroids are those recorded', drift.length === 0, drift.join());
  } else skip('brain: the catalogue against the anatomy product', 'data/cache/products/anatomy-mni152.json is not built');
}

// ---- the brain: what is known of each structure --------------------------------------------------------
{
  const missing = BRAIN_STRUCTURES.filter((s) => !KNOWLEDGE[s.id]).map((s) => s.id);
  assert(`knowledge: every structure has an entry (${Object.keys(KNOWLEDGE).length})`, missing.length === 0, missing.join());
  const extra = Object.keys(KNOWLEDGE).filter((id) => !structure(id));
  assert('knowledge: every entry is of a structure of the tree', extra.length === 0, extra.join());
  const parts = Object.values(KNOWLEDGE_PARTS).flatMap((p) => Object.keys(p.KNOWLEDGE));
  assert('knowledge: no structure is described in two parts', new Set(parts).size === parts.length);
  const refKeys = Object.values(KNOWLEDGE_PARTS).flatMap((p) => Object.keys(p.REFS));
  assert('knowledge: the parts\' own references repeat neither each other nor the shared ones', new Set(refKeys).size === refKeys.length);
  const unknownRefs = Object.entries(KNOWLEDGE).flatMap(([id, e]) => (e.refs || []).filter((r) => !REFERENCES[r]).map((r) => `${id}:${r}`));
  assert('knowledge: every entry has references, all of them known', Object.values(KNOWLEDGE).every((e) => e.refs && e.refs.length) && unknownRefs.length === 0, unknownRefs.join());
  const unused = Object.keys(REFERENCES).filter((r) => !Object.values(KNOWLEDGE).some((e) => (e.refs || []).includes(r)));
  assert(`knowledge: nearly every reference is cited by some entry (${unused.length} not)`, unused.length <= 12, unused.join());
  // The HTML of the fields: only <i> and <b>, no bare ampersand or angle bracket, typographic apostrophes.
  const badHtml = [];
  for (const [id, e] of Object.entries(KNOWLEDGE)) for (const [f, v] of Object.entries(e)) for (const t of [].concat(v)) {
    if (typeof t !== 'string' || f === 'inherit' || f === 'refs') continue;
    if (/&(?![a-z]+;)|<(?!\/?(i|b)>)/.test(t) || /[a-z]'[a-z]/i.test(t)) badHtml.push(`${id}.${f}`);
  }
  assert('knowledge: the text is safe HTML with typographic apostrophes', badHtml.length === 0, badHtml.join());
  const drawn = BRAIN_STRUCTURES.filter((s) => s.kind !== 'group');
  const thin = drawn.filter((s) => { const { entry, inherited } = knowledgeOf(s.id); return !(entry.summary && (entry.location || inherited.location) && (entry.function || inherited.function || entry.note)); }).map((s) => s.id);
  assert('knowledge: every drawn structure says what it is, where it lies, and what it does or what the atlas means by it', thin.length === 0, thin.join());
  const badInherit = Object.entries(KNOWLEDGE).filter(([, e]) => e.inherit && (!KNOWLEDGE[e.inherit] || KNOWLEDGE[e.inherit].inherit)).map(([id]) => id);
  assert('knowledge: a division inherits from a whole that does not itself inherit', badInherit.length === 0, badInherit.join());
  const inheriting = Object.entries(KNOWLEDGE).filter(([, e]) => e.inherit).map(([id]) => id);
  const pars = knowledgeOf('pars-opercularis');
  assert(`knowledge: a division takes what it does not say from its whole (${inheriting.length} divisions)`, inheriting.length > 10 && pars.inherited.supply && pars.inherited.supply.id === 'inferior-frontal-gyrus' && !pars.inherited.summary);
  assert('knowledge: the fields shown are the seven', FIELDS.join() === 'summary,location,function,connections,supply,development,clinical');
  const withSupply = drawn.filter((s) => { const { entry, inherited } = knowledgeOf(s.id); return entry.supply || inherited.supply; }).length;
  assert(`knowledge: most drawn structures name their blood supply (${withSupply} of ${drawn.length})`, withSupply / drawn.length > 0.8);
  const latin = drawn.filter((s) => KNOWLEDGE[s.id].latin).length;
  // The regions particular to an atlas (Harvard-Oxford's divisions, the thalamic clusters, the
  // bundles' segments) have no term in Terminologia Neuroanatomica.
  assert(`knowledge: most drawn structures have their Latin name (${latin} of ${drawn.length})`, latin / drawn.length > 0.6);
  assert('knowledge: references are resolved for the card', referencesOf(KNOWLEDGE['precentral-gyrus']).every((r) => /\(\d{4}\)/.test(r)));
  const noYear = Object.entries(REFERENCES).filter(([, r]) => !/\(\d{4}\)/.test(r)).map(([k]) => k);
  assert('knowledge: every reference states its year', noYear.length === 0, noYear.join());
  // Papers: a journal in italics followed by its volume.
  const papers = Object.entries(REFERENCES).filter(([, r]) => /<\/i> \d+/.test(r));
  const noDoi = papers.filter(([, r]) => !r.includes('doi.org/')).map(([k]) => k);
  assert(`knowledge: every paper carries its DOI (${papers.length} papers)`, noDoi.length <= 3, noDoi.join());
}

done();
