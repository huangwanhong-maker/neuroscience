// The human brain as a tree of named structures, in the MNI 152 ICBM 2009c
// asymmetric space, joined to the meshes and labels of the anatomy product
// (data/products/brain_anatomy.py).
//
// The tree is topographic: the cerebrum holds its cortex by lobe and gyrus, its
// white matter and fibre bundles, its basal nuclei and limbic structures; then
// come the diencephalon, the brainstem, the cerebellum and the ventricles.
// Functional systems, which cut across it, are listed in SYSTEMS. Every leaf
// names its sources as keys "source:label":
//
//   ho:v      Harvard-Oxford cortical atlas, lateralised, value v (odd left, even right)
//   aseg:v    FreeSurfer's segmentation of the template (FreeSurferColorLUT values)
//   massp:v   MASSP 2.0 (Bazin et al. 2020, 2025), as TemplateFlow's table numbers it
//   mial:v    thalamic nuclei (Najdenovska et al. 2018), 1-7 left, 8-14 right
//   dwm:v     deep white-matter bundles (Guevara et al. 2012), 1-21 left, 31-51 right
//   jlh:name, jrh:name   Julich-Brain 3.1's cerebellar nuclei, by hemisphere
//   cortex:lh, white:lh, cerebellum:lh   surfaces made from the tissue maps
//
// `mesh` keys name the surfaces drawn; `label` keys the values of the joined label
// volume and of the cortex's vertices. A structure on both sides has `left` and
// `right` keys, a midline one `mid`. The sides of every label were checked by the
// centroids of its voxels (tests/run-tests.mjs, fixtures/brain-centroids.json).
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

const pair = (l, r) => ({ left: l, right: r });
const ho = (v) => pair(`ho:${v}`, `ho:${v + 1}`);
const aseg = (l, r) => (r === undefined ? { mid: `aseg:${l}` } : pair(`aseg:${l}`, `aseg:${r}`));
const massp = (l, r) => (r === undefined ? { mid: `massp:${l}` } : pair(`massp:${l}`, `massp:${r}`));
const mial = (l) => pair(`mial:${l}`, `mial:${l + 7}`);
const dwm = (l) => pair(`dwm:${l}`, `dwm:${l + 30}`);
const julich = (name) => pair(`jlh:${name}`, `jrh:${name}`);
const surface = (name) => pair(`${name}:lh`, `${name}:rh`);
// A structure whose mesh and label share their keys.
const both = (keys) => ({ mesh: keys, label: keys });

// The lobes' colours: soft, warm and distinguishable; each gyrus a variation of its lobe's.
// (Defined from hue, saturation and lightness below, where hslToHex is.)
export const LOBE_COLOURS = {};
const LOBE_HSL = {
  frontal: [350, 0.30, 0.71], parietal: [264, 0.24, 0.72], temporal: [158, 0.21, 0.67],
  occipital: [38, 0.34, 0.69], limbic: [16, 0.38, 0.71], insula: [222, 0.30, 0.70],
};

const S = [];
const add = (id, name, parent, kind, extra = {}) => { S.push({ id, name, parent, kind, ...extra }); };

// ---- the cerebrum ------------------------------------------------------------------------------
add('brain', 'Brain', null, 'group');
add('cerebrum', 'Cerebrum', 'brain', 'group');
// The cortex's voxels carry the labels of its gyri (Harvard-Oxford's), into which the product
// divides FreeSurfer's cortex label; the cortex as a whole is its surfaces and its gyri.
add('cerebral-cortex', 'Cerebral cortex', 'cerebrum', 'surface', { mesh: surface('cortex'), colour: '#e9cdc5' });

add('frontal-lobe', 'Frontal lobe', 'cerebral-cortex', 'lobe', { lobe: 'frontal', colour: LOBE_COLOURS.frontal });
add('frontal-pole', 'Frontal pole', 'frontal-lobe', 'gyrus', { label: ho(1) });
add('superior-frontal-gyrus', 'Superior frontal gyrus', 'frontal-lobe', 'gyrus', { label: ho(5) });
add('middle-frontal-gyrus', 'Middle frontal gyrus', 'frontal-lobe', 'gyrus', { label: ho(7) });
add('inferior-frontal-gyrus', 'Inferior frontal gyrus', 'frontal-lobe', 'group');
add('pars-triangularis', 'Inferior frontal gyrus, pars triangularis', 'inferior-frontal-gyrus', 'gyrus', { label: ho(9) });
add('pars-opercularis', 'Inferior frontal gyrus, pars opercularis', 'inferior-frontal-gyrus', 'gyrus', { label: ho(11) });
add('precentral-gyrus', 'Precentral gyrus', 'frontal-lobe', 'gyrus', { label: ho(13) });
add('supplementary-motor-area', 'Supplementary motor area (juxtapositional lobule)', 'frontal-lobe', 'gyrus', { label: ho(51) });
add('frontal-medial-cortex', 'Frontal medial cortex', 'frontal-lobe', 'gyrus', { label: ho(49) });
add('frontal-orbital-cortex', 'Frontal orbital cortex', 'frontal-lobe', 'gyrus', { label: ho(65) });
add('frontal-operculum', 'Frontal operculum', 'frontal-lobe', 'gyrus', { label: ho(81) });

add('parietal-lobe', 'Parietal lobe', 'cerebral-cortex', 'lobe', { lobe: 'parietal', colour: LOBE_COLOURS.parietal });
add('postcentral-gyrus', 'Postcentral gyrus', 'parietal-lobe', 'gyrus', { label: ho(33) });
add('superior-parietal-lobule', 'Superior parietal lobule', 'parietal-lobe', 'gyrus', { label: ho(35) });
add('supramarginal-gyrus', 'Supramarginal gyrus', 'parietal-lobe', 'group');
add('supramarginal-gyrus-anterior', 'Supramarginal gyrus, anterior division', 'supramarginal-gyrus', 'gyrus', { label: ho(37) });
add('supramarginal-gyrus-posterior', 'Supramarginal gyrus, posterior division', 'supramarginal-gyrus', 'gyrus', { label: ho(39) });
add('angular-gyrus', 'Angular gyrus', 'parietal-lobe', 'gyrus', { label: ho(41) });
add('precuneus', 'Precuneus', 'parietal-lobe', 'gyrus', { label: ho(61) });
add('central-operculum', 'Central operculum', 'parietal-lobe', 'gyrus', { label: ho(83) });
add('parietal-operculum', 'Parietal operculum', 'parietal-lobe', 'gyrus', { label: ho(85) });

add('temporal-lobe', 'Temporal lobe', 'cerebral-cortex', 'lobe', { lobe: 'temporal', colour: LOBE_COLOURS.temporal });
add('temporal-pole', 'Temporal pole', 'temporal-lobe', 'gyrus', { label: ho(15) });
add('superior-temporal-gyrus', 'Superior temporal gyrus', 'temporal-lobe', 'group');
add('superior-temporal-gyrus-anterior', 'Superior temporal gyrus, anterior division', 'superior-temporal-gyrus', 'gyrus', { label: ho(17) });
add('superior-temporal-gyrus-posterior', 'Superior temporal gyrus, posterior division', 'superior-temporal-gyrus', 'gyrus', { label: ho(19) });
add('middle-temporal-gyrus', 'Middle temporal gyrus', 'temporal-lobe', 'group');
add('middle-temporal-gyrus-anterior', 'Middle temporal gyrus, anterior division', 'middle-temporal-gyrus', 'gyrus', { label: ho(21) });
add('middle-temporal-gyrus-posterior', 'Middle temporal gyrus, posterior division', 'middle-temporal-gyrus', 'gyrus', { label: ho(23) });
add('middle-temporal-gyrus-temporooccipital', 'Middle temporal gyrus, temporo-occipital part', 'middle-temporal-gyrus', 'gyrus', { label: ho(25) });
add('inferior-temporal-gyrus', 'Inferior temporal gyrus', 'temporal-lobe', 'group');
add('inferior-temporal-gyrus-anterior', 'Inferior temporal gyrus, anterior division', 'inferior-temporal-gyrus', 'gyrus', { label: ho(27) });
add('inferior-temporal-gyrus-posterior', 'Inferior temporal gyrus, posterior division', 'inferior-temporal-gyrus', 'gyrus', { label: ho(29) });
add('inferior-temporal-gyrus-temporooccipital', 'Inferior temporal gyrus, temporo-occipital part', 'inferior-temporal-gyrus', 'gyrus', { label: ho(31) });
add('planum-polare', 'Planum polare', 'temporal-lobe', 'gyrus', { label: ho(87) });
add('heschl-gyrus', 'Heschl’s gyrus (transverse temporal gyrus)', 'temporal-lobe', 'gyrus', { label: ho(89) });
add('planum-temporale', 'Planum temporale', 'temporal-lobe', 'gyrus', { label: ho(91) });
add('fusiform-gyrus', 'Fusiform gyrus', 'temporal-lobe', 'group');
add('temporal-fusiform-anterior', 'Temporal fusiform cortex, anterior division', 'fusiform-gyrus', 'gyrus', { label: ho(73) });
add('temporal-fusiform-posterior', 'Temporal fusiform cortex, posterior division', 'fusiform-gyrus', 'gyrus', { label: ho(75) });
add('temporal-occipital-fusiform', 'Temporal occipital fusiform cortex', 'fusiform-gyrus', 'gyrus', { label: ho(77) });

add('occipital-lobe', 'Occipital lobe', 'cerebral-cortex', 'lobe', { lobe: 'occipital', colour: LOBE_COLOURS.occipital });
add('lateral-occipital-cortex', 'Lateral occipital cortex', 'occipital-lobe', 'group');
add('lateral-occipital-superior', 'Lateral occipital cortex, superior division', 'lateral-occipital-cortex', 'gyrus', { label: ho(43) });
add('lateral-occipital-inferior', 'Lateral occipital cortex, inferior division', 'lateral-occipital-cortex', 'gyrus', { label: ho(45) });
add('intracalcarine-cortex', 'Intracalcarine cortex', 'occipital-lobe', 'gyrus', { label: ho(47) });
add('supracalcarine-cortex', 'Supracalcarine cortex', 'occipital-lobe', 'gyrus', { label: ho(93) });
add('cuneus', 'Cuneus', 'occipital-lobe', 'gyrus', { label: ho(63) });
add('lingual-gyrus', 'Lingual gyrus', 'occipital-lobe', 'gyrus', { label: ho(71) });
add('occipital-fusiform-gyrus', 'Occipital fusiform gyrus', 'occipital-lobe', 'gyrus', { label: ho(79) });
add('occipital-pole', 'Occipital pole', 'occipital-lobe', 'gyrus', { label: ho(95) });

add('limbic-lobe', 'Limbic lobe', 'cerebral-cortex', 'lobe', { lobe: 'limbic', colour: LOBE_COLOURS.limbic });
add('cingulate-gyrus', 'Cingulate gyrus', 'limbic-lobe', 'group');
add('cingulate-gyrus-anterior', 'Cingulate gyrus, anterior division', 'cingulate-gyrus', 'gyrus', { label: ho(57) });
add('cingulate-gyrus-posterior', 'Cingulate gyrus, posterior division', 'cingulate-gyrus', 'gyrus', { label: ho(59) });
add('paracingulate-gyrus', 'Paracingulate gyrus', 'limbic-lobe', 'gyrus', { label: ho(55) });
add('subcallosal-cortex', 'Subcallosal cortex', 'limbic-lobe', 'gyrus', { label: ho(53) });
add('parahippocampal-gyrus', 'Parahippocampal gyrus', 'limbic-lobe', 'group');
add('parahippocampal-gyrus-anterior', 'Parahippocampal gyrus, anterior division', 'parahippocampal-gyrus', 'gyrus', { label: ho(67) });
add('parahippocampal-gyrus-posterior', 'Parahippocampal gyrus, posterior division', 'parahippocampal-gyrus', 'gyrus', { label: ho(69) });

add('insula', 'Insula', 'cerebral-cortex', 'lobe', { lobe: 'insula', colour: LOBE_COLOURS.insula, label: ho(3) });

// White matter.
add('cerebral-white-matter', 'Cerebral white matter', 'cerebrum', 'surface', { mesh: surface('white'), label: aseg(2, 41), colour: '#f2e7dc' });
add('corpus-callosum', 'Corpus callosum', 'cerebral-white-matter', 'group', { colour: '#f4ede6' });
add('corpus-callosum-anterior', 'Corpus callosum, anterior segment', 'corpus-callosum', 'tract', { ...both(aseg(255)), colour: '#f6efe6' });
add('corpus-callosum-mid-anterior', 'Corpus callosum, mid-anterior segment', 'corpus-callosum', 'tract', { ...both(aseg(254)), colour: '#f1e9e2' });
add('corpus-callosum-central', 'Corpus callosum, central segment', 'corpus-callosum', 'tract', { ...both(aseg(253)), colour: '#ece4de' });
add('corpus-callosum-mid-posterior', 'Corpus callosum, mid-posterior segment', 'corpus-callosum', 'tract', { ...both(aseg(252)), colour: '#e7e0db' });
add('corpus-callosum-posterior', 'Corpus callosum, posterior segment', 'corpus-callosum', 'tract', { ...both(aseg(251)), colour: '#e2dbd8' });
add('anterior-commissure', 'Anterior commissure', 'cerebral-white-matter', 'tract', { ...both(massp(54)), colour: '#efe2cc' });
add('posterior-commissure', 'Posterior commissure', 'cerebral-white-matter', 'tract', { ...both(massp(55)), colour: '#eadbc4' });
add('internal-capsule', 'Internal capsule', 'cerebral-white-matter', 'tract', { ...both(massp(21, 22)), colour: '#e9dccd' });
add('fibre-bundles', 'Fibre bundles', 'cerebral-white-matter', 'group');
// The arcuate's three segments in the colours of Catani et al. (2005): the long segment red,
// the anterior green, the posterior yellow.
add('arcuate-fasciculus', 'Arcuate fasciculus', 'fibre-bundles', 'group', { colour: '#e3868c' });
add('arcuate-direct', 'Arcuate fasciculus, direct (long) segment', 'arcuate-fasciculus', 'tract', { ...both(dwm(1)), colour: '#e3868c' });
add('arcuate-anterior', 'Arcuate fasciculus, anterior segment', 'arcuate-fasciculus', 'tract', { ...both(dwm(2)), colour: '#93cf98' });
add('arcuate-posterior', 'Arcuate fasciculus, posterior segment', 'arcuate-fasciculus', 'tract', { ...both(dwm(3)), colour: '#ecd27a' });
add('cingulum', 'Cingulum', 'fibre-bundles', 'group', { colour: '#7fc4c8' });
add('cingulum-long', 'Cingulum, long fibres', 'cingulum', 'tract', { ...both(dwm(4)), colour: '#7fc4c8' });
add('cingulum-short', 'Cingulum, short fibres', 'cingulum', 'tract', { ...both(dwm(5)), colour: '#a3d8d6' });
add('cingulum-temporal', 'Cingulum, temporal fibres', 'cingulum', 'tract', { ...both(dwm(6)), colour: '#62acb6' });
add('corticospinal-tract', 'Corticospinal tract', 'fibre-bundles', 'tract', { ...both(dwm(11)), colour: '#a7a9ea' });
add('inferior-fronto-occipital-fasciculus', 'Inferior fronto-occipital fasciculus', 'fibre-bundles', 'tract', { ...both(dwm(14)), colour: '#8fc0ea' });
add('inferior-longitudinal-fasciculus', 'Inferior longitudinal fasciculus', 'fibre-bundles', 'tract', { ...both(dwm(15)), colour: '#c49be0' });
add('uncinate-fasciculus', 'Uncinate fasciculus', 'fibre-bundles', 'tract', { ...both(dwm(21)), colour: '#efa3c3' });

// Basal nuclei and basal forebrain.
add('basal-nuclei', 'Basal nuclei', 'cerebrum', 'group');
add('caudate-nucleus', 'Caudate nucleus', 'basal-nuclei', 'nucleus', { ...both(aseg(11, 50)), colour: '#79b4cf' });
add('putamen', 'Putamen', 'basal-nuclei', 'nucleus', { ...both(aseg(12, 51)), colour: '#e28aa6' });
add('globus-pallidus', 'Globus pallidus', 'basal-nuclei', 'nucleus', { ...both(aseg(13, 52)), colour: '#b39be0' });
add('globus-pallidus-externus', 'Globus pallidus, external segment', 'globus-pallidus', 'nucleus', { ...both(massp(11, 12)), colour: '#c3afe8' });
add('globus-pallidus-internus', 'Globus pallidus, internal segment', 'globus-pallidus', 'nucleus', { ...both(massp(9, 10)), colour: '#9a7fd2' });
add('nucleus-accumbens', 'Nucleus accumbens', 'basal-nuclei', 'nucleus', { ...both(aseg(26, 58)), colour: '#f1ae6f' });
add('claustrum', 'Claustrum', 'basal-nuclei', 'nucleus', { ...both(massp(30, 31)), colour: '#a6d3c5' });
add('basal-forebrain', 'Basal forebrain', 'cerebrum', 'group');
add('nucleus-basalis', 'Cholinergic basal forebrain nuclei', 'basal-forebrain', 'nucleus', { ...both(massp(56, 57)), colour: '#f0d08a' });

// Limbic structures of the medial temporal lobe.
add('limbic-structures', 'Hippocampus, amygdala and fornix', 'cerebrum', 'group');
add('hippocampus', 'Hippocampus', 'limbic-structures', 'nucleus', { ...both(aseg(17, 53)), colour: '#e9c25e' });
add('ca1', 'Cornu ammonis 1 (CA1)', 'hippocampus', 'nucleus', { ...both(massp(42, 43)), colour: '#efcd72' });
add('ca23', 'Cornu ammonis 2 and 3 (CA2/3)', 'hippocampus', 'nucleus', { ...both(massp(44, 45)), colour: '#e3b04f' });
add('dentate-gyrus', 'Dentate gyrus', 'hippocampus', 'nucleus', { ...both(massp(46, 47)), colour: '#f4dc97' });
add('subiculum', 'Subiculum', 'hippocampus', 'nucleus', { ...both(massp(50, 51)), colour: '#d9a24a' });
add('presubiculum', 'Presubiculum', 'hippocampus', 'nucleus', { ...both(massp(48, 49)), colour: '#cf9445' });
add('uncus', 'Uncus', 'hippocampus', 'nucleus', { ...both(massp(52, 53)), colour: '#f0c987' });
add('amygdala', 'Amygdala', 'limbic-structures', 'nucleus', { ...both(aseg(18, 54)), colour: '#e27f7a' });
add('fornix', 'Fornix', 'limbic-structures', 'tract', { ...both(massp(25)), colour: '#f2e2c4' });

// ---- the diencephalon ---------------------------------------------------------------------------
add('diencephalon', 'Diencephalon', 'brain', 'group');
add('thalamus', 'Thalamus', 'diencephalon', 'nucleus', { ...both(aseg(10, 49)), colour: '#8fc39f' });
add('thalamus-ventral-anterior', 'Ventral anterior nucleus', 'thalamus', 'nucleus', { ...both(mial(2)), colour: '#a6d4a8' });
add('thalamus-ventrolateral', 'Ventrolateral nucleus', 'thalamus', 'nucleus', { ...both(mial(6)), colour: '#7fbf8f' });
add('thalamus-ventral-posterior-ventrolateral', 'Ventral posterior and ventrolateral group', 'thalamus', 'nucleus', { ...both(mial(7)), colour: '#69aa86' });
add('thalamus-lateral-posterior-ventral-posterior', 'Lateral posterior and ventral posterior group', 'thalamus', 'nucleus', { ...both(mial(4)), colour: '#b4d99a' });
add('thalamus-mediodorsal', 'Mediodorsal nucleus', 'thalamus', 'nucleus', { ...both(mial(3)), colour: '#9ccfbe' });
add('thalamus-pulvinar', 'Pulvinar', 'thalamus', 'nucleus', { ...both(mial(1)), colour: '#c9e0a3' });
add('thalamus-pulvinar-medial-centrolateral', 'Medial pulvinar and centrolateral group', 'thalamus', 'nucleus', { ...both(mial(5)), colour: '#8cc8ad' });
add('lateral-geniculate-nucleus', 'Lateral geniculate nucleus', 'thalamus', 'nucleus', { ...both(massp(60, 61)), colour: '#9fc6ef' });
add('medial-geniculate-nucleus', 'Medial geniculate nucleus', 'thalamus', 'nucleus', { ...both(massp(62, 63)), colour: '#efb39f' });
add('habenula', 'Lateral habenula', 'diencephalon', 'nucleus', { ...both(massp(36, 37)), colour: '#f6c47e' });
add('subthalamic-nucleus', 'Subthalamic nucleus', 'diencephalon', 'nucleus', { ...both(massp(3, 4)), colour: '#f0cf63' });
add('ventral-diencephalon', 'Ventral diencephalon (hypothalamus and subthalamus)', 'diencephalon', 'region', { ...both(aseg(28, 60)), colour: '#e7a682' });
add('optic-chiasm', 'Optic chiasm', 'diencephalon', 'tract', { ...both(aseg(85)), colour: '#eedcb3' });

// ---- the brainstem --------------------------------------------------------------------------------
add('brainstem', 'Brainstem', 'brain', 'region', { ...both(aseg(16)), colour: '#cdb6ab' });
add('midbrain', 'Midbrain nuclei', 'brainstem', 'group');
add('substantia-nigra', 'Substantia nigra', 'midbrain', 'nucleus', { ...both(massp(5, 6)), colour: '#6c4a64' });
add('red-nucleus', 'Red nucleus', 'midbrain', 'nucleus', { ...both(massp(7, 8)), colour: '#cf5b5b' });
add('ventral-tegmental-area', 'Ventral tegmental area', 'midbrain', 'nucleus', { ...both(massp(23, 24)), colour: '#ea9a6b' });
add('periaqueductal-grey', 'Periaqueductal grey', 'midbrain', 'nucleus', { ...both(massp(26, 27)), colour: '#c7a2d4' });
add('superior-colliculus', 'Superior colliculus', 'midbrain', 'nucleus', { ...both(massp(34, 35)), colour: '#d5b3e3' });
add('inferior-colliculus', 'Inferior colliculus', 'midbrain', 'nucleus', { ...both(massp(32, 33)), colour: '#b4c6ea' });
add('raphe-reticular', 'Raphe and tegmental nuclei', 'brainstem', 'group');
add('dorsal-raphe-nucleus', 'Dorsal raphe nucleus', 'raphe-reticular', 'nucleus', { ...both(massp(58)), colour: '#8ed0c9' });
add('median-raphe-nucleus', 'Median raphe nucleus', 'raphe-reticular', 'nucleus', { ...both(massp(59)), colour: '#6fbdb5' });
add('pedunculopontine-nucleus', 'Pedunculopontine nucleus', 'raphe-reticular', 'nucleus', { ...both(massp(28, 29)), colour: '#e7c3a0' });

// ---- the cerebellum ---------------------------------------------------------------------------------
add('cerebellum', 'Cerebellum', 'brain', 'group');
add('cerebellar-cortex', 'Cerebellar cortex', 'cerebellum', 'surface', { mesh: surface('cerebellum'), label: aseg(8, 47), colour: '#dcb58c' });
add('cerebellar-white-matter', 'Cerebellar white matter (arbor vitae)', 'cerebellum', 'region', { ...both(aseg(7, 46)), colour: '#f1e4cf' });
add('cerebellar-nuclei', 'Deep cerebellar nuclei', 'cerebellum', 'group');
add('dentate-nucleus', 'Dentate nucleus', 'cerebellar-nuclei', 'nucleus', { ...both(julich('dentate')), colour: '#c98b5b' });
add('interposed-nucleus', 'Interposed nucleus', 'cerebellar-nuclei', 'nucleus', { ...both(julich('interposed')), colour: '#d9a06e' });
add('fastigial-nucleus', 'Fastigial nucleus', 'cerebellar-nuclei', 'nucleus', { ...both(julich('fastigial')), colour: '#e8b885' });

// ---- the ventricles -----------------------------------------------------------------------------------
add('ventricular-system', 'Ventricular system', 'brain', 'group');
add('lateral-ventricle', 'Lateral ventricle', 'ventricular-system', 'ventricle', { ...both(aseg(4, 43)), colour: '#8fd0e6' });
add('inferior-horn', 'Lateral ventricle, inferior (temporal) horn', 'lateral-ventricle', 'ventricle', { ...both(aseg(5, 44)), colour: '#a6dbea' });
add('third-ventricle', 'Third ventricle', 'ventricular-system', 'ventricle', { ...both(aseg(14)), colour: '#7cc4dc' });
add('fourth-ventricle', 'Fourth ventricle', 'ventricular-system', 'ventricle', { ...both(aseg(15)), colour: '#6db8d4' });
add('choroid-plexus', 'Choroid plexus', 'ventricular-system', 'region', { ...both(aseg(31, 63)), colour: '#e59fb3' });
add('csf', 'Cerebrospinal fluid outside the ventricles', 'ventricular-system', 'region', { label: aseg(24), colour: '#b6dfec' });

// ---- other labels of the segmentation -------------------------------------------------------------------
add('other', 'Other labels', 'brain', 'group');
add('vessel', 'Vessel', 'other', 'region', { label: aseg(30, 62), colour: '#c46d7e' });
add('white-matter-hypointensities', 'White-matter hypointensities', 'other', 'region', { label: aseg(77), colour: '#d8c8e8' });

// Colours of the gyri: variations of their lobe's colour, alternating in lightness so that
// neighbours stand apart.
function hexToHsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min, s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hslToHex(h, s, l) {
  const k = (n) => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(255 * x).toString(16).padStart(2, '0')).join('')}`;
}
for (const [lobe, [h, s, l]] of Object.entries(LOBE_HSL)) LOBE_COLOURS[lobe] = hslToHex(h, s, l);
for (const s of S) if (s.lobe && s.kind === 'lobe') s.colour = LOBE_COLOURS[s.lobe];
{
  const byLobe = new Map();
  for (const s of S) {
    if (s.kind !== 'gyrus') continue;
    let lobe = null;
    for (let p = s; p; p = S.find((x) => x.id === p.parent)) if (p.lobe) { lobe = p.lobe; break; }
    s.lobe = lobe;
    if (!byLobe.has(lobe)) byLobe.set(lobe, []);
    byLobe.get(lobe).push(s);
  }
  for (const [lobe, list] of byLobe) {
    const [h, sat, l] = hexToHsl(LOBE_COLOURS[lobe]);
    list.forEach((s, i) => {
      const t = list.length > 1 ? i / (list.length - 1) : 0.5;
      const hue = h - 14 + 28 * t;
      const light = Math.min(0.82, Math.max(0.6, l + (i % 2 ? 0.05 : -0.035) + (i % 3 === 2 ? 0.02 : 0)));
      const satur = Math.min(0.42, Math.max(0.16, sat + (i % 2 ? -0.03 : 0.03)));
      s.colour = hslToHex((hue + 360) % 360, satur, light);
    });
  }
}
S.find((s) => s.id === 'insula').lobe = 'insula';

// Short names, for labels where space is scarce. The thalamic abbreviations are those of
// Hirai and Jones's nomenclature (VA, VL, VP, LP, MD, CL), as Najdenovska et al. use them.
const SHORT = {
  'pars-triangularis': 'Pars triangularis', 'pars-opercularis': 'Pars opercularis',
  'supplementary-motor-area': 'Supplementary motor area', 'heschl-gyrus': 'Heschl’s gyrus',
  'corpus-callosum-anterior': 'Callosum, anterior', 'corpus-callosum-mid-anterior': 'Callosum, mid-anterior',
  'corpus-callosum-central': 'Callosum, central', 'corpus-callosum-mid-posterior': 'Callosum, mid-posterior',
  'corpus-callosum-posterior': 'Callosum, posterior',
  'arcuate-direct': 'Arcuate, long segment', 'arcuate-anterior': 'Arcuate, anterior segment', 'arcuate-posterior': 'Arcuate, posterior segment',
  'inferior-fronto-occipital-fasciculus': 'Inferior fronto-occipital fasc.', 'inferior-longitudinal-fasciculus': 'Inferior longitudinal fasc.',
  'globus-pallidus-externus': 'External pallidum', 'globus-pallidus-internus': 'Internal pallidum',
  'nucleus-basalis': 'Basal forebrain nuclei',
  'thalamus-ventral-anterior': 'Thalamus, VA', 'thalamus-ventrolateral': 'Thalamus, VL',
  'thalamus-ventral-posterior-ventrolateral': 'Thalamus, VP–VL', 'thalamus-lateral-posterior-ventral-posterior': 'Thalamus, LP–VP',
  'thalamus-mediodorsal': 'Thalamus, MD', 'thalamus-pulvinar': 'Pulvinar', 'thalamus-pulvinar-medial-centrolateral': 'Medial pulvinar and CL',
  'lateral-geniculate-nucleus': 'Lateral geniculate', 'medial-geniculate-nucleus': 'Medial geniculate',
  'ventral-diencephalon': 'Ventral diencephalon', 'cerebellar-white-matter': 'Cerebellar white matter',
  'inferior-horn': 'Inferior horn', 'csf': 'Cerebrospinal fluid',
  'temporal-fusiform-anterior': 'Fusiform, anterior', 'temporal-fusiform-posterior': 'Fusiform, posterior',
  'temporal-occipital-fusiform': 'Temporo-occipital fusiform',
};
// A division of a gyrus is named by the gyrus and the division: “Superior temporal, posterior”.
const shorten = (name) => name.replace(/ \([^)]*\)$/, '').replace(/ (gyrus|cortex), (\w+) division$/, ', $2').replace(/ gyrus, temporo-occipital part$/, ', temporo-occipital');
for (const s of S) s.short = SHORT[s.id] || shorten(s.name);

export const BRAIN_STRUCTURES = S;
const BY_ID = new Map(S.map((s) => [s.id, s]));
export const structure = (id) => BY_ID.get(id) || null;
export const childrenOf = (id) => S.filter((s) => s.parent === id);
export function ancestorsOf(id) {
  const out = [];
  for (let s = structure(structure(id)?.parent); s; s = structure(s.parent)) out.push(s);
  return out;
}
export function descendantsOf(id) {
  const out = [];
  const walk = (p) => { for (const c of childrenOf(p)) { out.push(c); walk(c.id); } };
  walk(id);
  return out;
}

// The keys of a structure and of everything beneath it, by side: what to draw and what
// to light when the structure is chosen.
export function keysOf(id, which = 'label') {
  const out = { left: new Set(), right: new Set(), mid: new Set() };
  for (const s of [structure(id), ...descendantsOf(id)]) {
    const k = s && s[which];
    if (!k) continue;
    for (const side of ['left', 'right', 'mid']) if (k[side]) out[side].add(k[side]);
  }
  return out;
}

// The structure and side a key names: the inverse of the keys above, for labels and meshes.
const KEY_INDEX = new Map();
for (const s of S) {
  for (const which of ['label', 'mesh']) {
    const k = s[which];
    if (!k) continue;
    for (const side of ['left', 'right', 'mid']) if (k[side] && !KEY_INDEX.has(`${which}|${k[side]}`)) KEY_INDEX.set(`${which}|${k[side]}`, { id: s.id, side });
  }
}
export const structureOfKey = (key, which = 'label') => KEY_INDEX.get(`${which}|${key}`) || (which === 'label' ? KEY_INDEX.get(`mesh|${key}`) : KEY_INDEX.get(`label|${key}`)) || null;

// The lobe of a structure, if it lies in the cerebral cortex.
export function lobeOf(id) {
  for (let s = structure(id); s; s = structure(s.parent)) if (s.lobe) return s.lobe;
  return null;
}

// Functional systems: structures that work together, across the topographic tree.
export const SYSTEMS = [
  { id: 'motor', name: 'Motor system', summary: 'Voluntary movement: planned in the premotor and supplementary motor areas, issued by the primary motor cortex down the corticospinal tract, and shaped by two loops, through the basal ganglia and through the cerebellum, that return to the cortex by the motor thalamus.',
    members: ['precentral-gyrus', 'supplementary-motor-area', 'corticospinal-tract', 'internal-capsule', 'putamen', 'globus-pallidus-externus', 'globus-pallidus-internus', 'subthalamic-nucleus', 'substantia-nigra', 'thalamus-ventrolateral', 'thalamus-ventral-anterior', 'cerebellar-cortex', 'dentate-nucleus', 'interposed-nucleus', 'red-nucleus'] },
  { id: 'somatosensory', name: 'Somatosensory system', summary: 'Touch, position sense, pain and temperature, relayed by the ventral posterior thalamus to the primary somatosensory cortex of the postcentral gyrus, and on to the parietal operculum (second somatosensory area) and the superior parietal lobule.',
    members: ['postcentral-gyrus', 'thalamus-ventral-posterior-ventrolateral', 'thalamus-lateral-posterior-ventral-posterior', 'parietal-operculum', 'superior-parietal-lobule', 'supramarginal-gyrus-anterior'] },
  { id: 'visual', name: 'Visual system', summary: 'From the optic chiasm, where the nasal fibres of each eye cross, to the lateral geniculate nucleus and through the optic radiation to the primary visual cortex around the calcarine sulcus; then forward in a ventral stream for what is seen and a dorsal stream for where it is. The superior colliculus and the pulvinar form a second route that guides the eyes and attention.',
    members: ['optic-chiasm', 'lateral-geniculate-nucleus', 'intracalcarine-cortex', 'supracalcarine-cortex', 'occipital-pole', 'cuneus', 'lingual-gyrus', 'lateral-occipital-inferior', 'lateral-occipital-superior', 'occipital-fusiform-gyrus', 'temporal-occipital-fusiform', 'superior-colliculus', 'thalamus-pulvinar', 'inferior-longitudinal-fasciculus'] },
  { id: 'auditory', name: 'Auditory system', summary: 'From the cochlear nuclei of the brainstem to the inferior colliculus, the medial geniculate nucleus, and the primary auditory cortex on Heschl’s gyrus, which lies tonotopically ordered in the depth of the lateral sulcus; the planum temporale and the superior temporal gyrus around it analyse sounds, and on the left, speech.',
    members: ['inferior-colliculus', 'medial-geniculate-nucleus', 'heschl-gyrus', 'planum-temporale', 'planum-polare', 'superior-temporal-gyrus-posterior', 'superior-temporal-gyrus-anterior'] },
  { id: 'language', name: 'Language network', summary: 'In most people on the left: the inferior frontal gyrus (Broca’s area) for producing and structuring speech, the posterior superior temporal gyrus and planum temporale (Wernicke’s area) for understanding it, the supramarginal and angular gyri between them, joined by the arcuate fasciculus dorsally and by the inferior fronto-occipital and uncinate fasciculi ventrally.',
    members: ['pars-opercularis', 'pars-triangularis', 'superior-temporal-gyrus-posterior', 'planum-temporale', 'middle-temporal-gyrus-posterior', 'supramarginal-gyrus-anterior', 'supramarginal-gyrus-posterior', 'angular-gyrus', 'arcuate-direct', 'arcuate-anterior', 'arcuate-posterior', 'inferior-fronto-occipital-fasciculus', 'uncinate-fasciculus'] },
  { id: 'memory', name: 'Memory: the medial temporal lobe and Papez’s circuit', summary: 'Episodic memories are formed by the hippocampus with the entorhinal and parahippocampal cortex; its output runs through the fornix to the mammillary bodies, on to the anterior thalamus, the cingulate gyrus and the cingulum, and back to the parahippocampal gyrus: the circuit Papez described in 1937.',
    members: ['hippocampus', 'ca1', 'ca23', 'dentate-gyrus', 'subiculum', 'presubiculum', 'parahippocampal-gyrus-anterior', 'parahippocampal-gyrus-posterior', 'fornix', 'cingulate-gyrus-posterior', 'cingulate-gyrus-anterior', 'cingulum-long', 'cingulum-temporal', 'ventral-diencephalon', 'thalamus'] },
  { id: 'emotion', name: 'Emotion and salience', summary: 'The amygdala evaluates what matters, the insula reads the state of the body, and the anterior cingulate and orbitofrontal cortex weigh both to guide behaviour; the hypothalamus and the periaqueductal grey carry the response out in the body.',
    members: ['amygdala', 'insula', 'cingulate-gyrus-anterior', 'paracingulate-gyrus', 'frontal-orbital-cortex', 'frontal-medial-cortex', 'subcallosal-cortex', 'ventral-diencephalon', 'periaqueductal-grey', 'uncinate-fasciculus'] },
  { id: 'reward', name: 'Reward and dopamine', summary: 'Dopamine neurons of the ventral tegmental area and the substantia nigra signal the difference between expected and received reward to the striatum, above all the nucleus accumbens, and to the prefrontal cortex; the lateral habenula signals the opposite, disappointment, and inhibits them.',
    members: ['ventral-tegmental-area', 'substantia-nigra', 'nucleus-accumbens', 'caudate-nucleus', 'putamen', 'frontal-orbital-cortex', 'frontal-medial-cortex', 'amygdala', 'habenula'] },
  { id: 'neuromodulation', name: 'Neuromodulatory nuclei', summary: 'Small groups of neurons in the brainstem and basal forebrain whose axons reach almost the whole brain: serotonin from the raphe nuclei, dopamine from the midbrain, acetylcholine from the basal forebrain and the pedunculopontine nucleus.',
    members: ['dorsal-raphe-nucleus', 'median-raphe-nucleus', 'ventral-tegmental-area', 'substantia-nigra', 'nucleus-basalis', 'pedunculopontine-nucleus'] },
  { id: 'csf', name: 'Cerebrospinal fluid', summary: 'The choroid plexus secretes cerebrospinal fluid into the lateral ventricles; it flows through the interventricular foramina to the third ventricle, down the cerebral aqueduct to the fourth, and out into the subarachnoid space, cushioning the brain and carrying away its wastes.',
    members: ['lateral-ventricle', 'inferior-horn', 'third-ventricle', 'fourth-ventricle', 'choroid-plexus'] },
];
export const system = (id) => SYSTEMS.find((s) => s.id === id) || null;
