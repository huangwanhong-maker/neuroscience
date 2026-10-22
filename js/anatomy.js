// Parcellations built into the domain: the gyral regions of Desikan and
// Killiany with the structures FreeSurfer labels beneath the cortex, and the
// neuraxis, the divisions of the central nervous system by its development.
//
// The Desikan-Killiany atlas (Desikan et al. 2006) divides each hemisphere's
// cortex into 34 regions by its gyri, each bounded by sulci named in a protocol;
// FreeSurfer's aparc labels them 1001-1035 on the left and 2001-2035 on the
// right (1004 and 2004, the corpus callosum, are not regions of the atlas), and
// its aseg labels the structures beneath. The labels, names and colours are
// those of FreeSurferColorLUT.txt (freesurfer/freesurfer, branch dev,
// retrieved 2026-10-22; tests/fixtures checks them), and the grouping into
// lobes is FreeSurfer's (the CorticalParcellation page of its wiki; Klein and
// Tourville 2012 for the protocol). The neuraxis follows the developmental
// divisions as every textbook gives them (Kandel et al., Principles of Neural
// Science, 6th ed., ch. 4; Swanson 2012).
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { Parcellation } from './parcellation.js';

// [FreeSurfer key, name, lobe, [r, g, b]], in the order of the labels 1001-1035.
const DK = [
  ['bankssts', 'Banks of the superior temporal sulcus', 'temporal', [25, 100, 40]],
  ['caudalanteriorcingulate', 'Caudal anterior cingulate', 'cingulate', [125, 100, 160]],
  ['caudalmiddlefrontal', 'Caudal middle frontal', 'frontal', [100, 25, 0]],
  ['corpuscallosum', 'Corpus callosum', null, [120, 70, 50]],
  ['cuneus', 'Cuneus', 'occipital', [220, 20, 100]],
  ['entorhinal', 'Entorhinal', 'temporal', [220, 20, 10]],
  ['fusiform', 'Fusiform', 'temporal', [180, 220, 140]],
  ['inferiorparietal', 'Inferior parietal', 'parietal', [220, 60, 220]],
  ['inferiortemporal', 'Inferior temporal', 'temporal', [180, 40, 120]],
  ['isthmuscingulate', 'Isthmus of the cingulate', 'cingulate', [140, 20, 140]],
  ['lateraloccipital', 'Lateral occipital', 'occipital', [20, 30, 140]],
  ['lateralorbitofrontal', 'Lateral orbitofrontal', 'frontal', [35, 75, 50]],
  ['lingual', 'Lingual', 'occipital', [225, 140, 140]],
  ['medialorbitofrontal', 'Medial orbitofrontal', 'frontal', [200, 35, 75]],
  ['middletemporal', 'Middle temporal', 'temporal', [160, 100, 50]],
  ['parahippocampal', 'Parahippocampal', 'temporal', [20, 220, 60]],
  ['paracentral', 'Paracentral', 'frontal', [60, 220, 60]],
  ['parsopercularis', 'Pars opercularis', 'frontal', [220, 180, 140]],
  ['parsorbitalis', 'Pars orbitalis', 'frontal', [20, 100, 50]],
  ['parstriangularis', 'Pars triangularis', 'frontal', [220, 60, 20]],
  ['pericalcarine', 'Pericalcarine', 'occipital', [120, 100, 60]],
  ['postcentral', 'Postcentral', 'parietal', [220, 20, 20]],
  ['posteriorcingulate', 'Posterior cingulate', 'cingulate', [220, 180, 220]],
  ['precentral', 'Precentral', 'frontal', [60, 20, 220]],
  ['precuneus', 'Precuneus', 'parietal', [160, 140, 180]],
  ['rostralanteriorcingulate', 'Rostral anterior cingulate', 'cingulate', [80, 20, 140]],
  ['rostralmiddlefrontal', 'Rostral middle frontal', 'frontal', [75, 50, 125]],
  ['superiorfrontal', 'Superior frontal', 'frontal', [20, 220, 160]],
  ['superiorparietal', 'Superior parietal', 'parietal', [20, 180, 140]],
  ['superiortemporal', 'Superior temporal', 'temporal', [140, 220, 220]],
  ['supramarginal', 'Supramarginal', 'parietal', [80, 160, 20]],
  ['frontalpole', 'Frontal pole', 'frontal', [100, 0, 100]],
  ['temporalpole', 'Temporal pole', 'temporal', [70, 70, 70]],
  ['transversetemporal', 'Transverse temporal', 'temporal', [150, 150, 200]],
  ['insula', 'Insula', 'insula', [255, 192, 32]],
];
const LOBES = [['frontal', 'Frontal lobe'], ['parietal', 'Parietal lobe'], ['temporal', 'Temporal lobe'], ['occipital', 'Occipital lobe'], ['cingulate', 'Cingulate cortex'], ['insula', 'Insula']];

// A bilateral region: the two hemispheric parts as children, each with its label
// (and, for three structures, FreeSurfer's slightly different colour on the right).
const bilateral = (name, left, right, colour, extra = {}, rightColour = colour) => ({
  name, colour, ...extra,
  children: [
    { name: `Left ${name.charAt(0).toLowerCase()}${name.slice(1)}`, label: left, hemisphere: 'left', colour, freesurfer: extra.freesurfer ? `Left-${extra.freesurfer}` : undefined },
    { name: `Right ${name.charAt(0).toLowerCase()}${name.slice(1)}`, label: right, hemisphere: 'right', colour: rightColour, freesurfer: extra.freesurfer ? `Right-${extra.freesurfer}` : undefined },
  ],
});

const cortexRegions = () => LOBES.map(([key, lobe]) => ({
  name: lobe,
  children: DK.map(([fs, name, lobeKey, colour], i) => (lobeKey === key ? {
    ...bilateral(name, 1001 + i, 2001 + i, colour, { freesurfer: fs }),
    children: [
      { name: `Left ${name.charAt(0).toLowerCase()}${name.slice(1)}`, label: 1001 + i, hemisphere: 'left', colour, freesurfer: `ctx-lh-${fs}` },
      { name: `Right ${name.charAt(0).toLowerCase()}${name.slice(1)}`, label: 2001 + i, hemisphere: 'right', colour, freesurfer: `ctx-rh-${fs}` },
    ],
  } : null)).filter(Boolean),
}));

// The gyral parcellation alone.
export const DESIKAN_KILLIANY = new Parcellation({
  id: 'desikan-killiany', name: 'Desikan-Killiany gyral parcellation (FreeSurfer aparc)', version: 'FreeSurfer aparc',
  species: 'Homo sapiens', modality: 'gyral anatomy', citations: ['Desikan2006', 'Klein2012'],
  description: 'The 34 gyral regions of each hemisphere, grouped by lobe, with the labels and colours of FreeSurfer.',
  regions: [{ name: 'Cerebral cortex', children: cortexRegions() }],
});

// The structures FreeSurfer labels beneath the cortex (aseg), grouped.
const subcortical = () => [
  bilateral('Cerebral white matter', 2, 41, [245, 245, 245], { freesurfer: 'Cerebral-White-Matter' }),
  {
    name: 'Subcortical grey matter',
    children: [
      bilateral('Thalamus', 10, 49, [0, 118, 14], { freesurfer: 'Thalamus' }),
      bilateral('Caudate', 11, 50, [122, 186, 220], { freesurfer: 'Caudate' }),
      bilateral('Putamen', 12, 51, [236, 13, 176], { freesurfer: 'Putamen' }),
      bilateral('Pallidum', 13, 52, [12, 48, 255], { freesurfer: 'Pallidum' }, [13, 48, 255]),
      bilateral('Accumbens area', 26, 58, [255, 165, 0], { freesurfer: 'Accumbens-area' }),
      bilateral('Ventral diencephalon', 28, 60, [145, 42, 42], { freesurfer: 'VentralDC' }, [165, 42, 42]),
      bilateral('Hippocampus', 17, 53, [220, 216, 20], { freesurfer: 'Hippocampus' }),
      bilateral('Amygdala', 18, 54, [103, 255, 255], { freesurfer: 'Amygdala' }),
    ],
  },
  {
    name: 'Cerebellum',
    children: [
      bilateral('Cerebellar white matter', 7, 46, [220, 248, 164], { freesurfer: 'Cerebellum-White-Matter' }),
      bilateral('Cerebellar cortex', 8, 47, [230, 148, 34], { freesurfer: 'Cerebellum-Cortex' }),
    ],
  },
  { name: 'Brain stem', label: 16, colour: [119, 159, 176], freesurfer: 'Brain-Stem' },
  {
    name: 'Ventricles and cerebrospinal fluid',
    children: [
      bilateral('Lateral ventricle', 4, 43, [120, 18, 134], { freesurfer: 'Lateral-Ventricle' }),
      bilateral('Inferior lateral ventricle', 5, 44, [196, 58, 250], { freesurfer: 'Inf-Lat-Vent' }),
      { name: 'Third ventricle', label: 14, colour: [204, 182, 142], freesurfer: '3rd-Ventricle' },
      { name: 'Fourth ventricle', label: 15, colour: [42, 204, 164], freesurfer: '4th-Ventricle' },
      { name: 'Fifth ventricle', label: 72, colour: [120, 190, 150], freesurfer: '5th-Ventricle' },
      { name: 'Cerebrospinal fluid', label: 24, colour: [60, 60, 60], freesurfer: 'CSF' },
      bilateral('Choroid plexus', 31, 63, [0, 200, 200], { freesurfer: 'choroid-plexus' }, [0, 200, 221]),
    ],
  },
  {
    name: 'Corpus callosum',
    colour: [0, 0, 160],
    children: [
      { name: 'Corpus callosum, posterior', label: 251, colour: [0, 0, 64], freesurfer: 'CC_Posterior' },
      { name: 'Corpus callosum, mid-posterior', label: 252, colour: [0, 0, 112], freesurfer: 'CC_Mid_Posterior' },
      { name: 'Corpus callosum, central', label: 253, colour: [0, 0, 160], freesurfer: 'CC_Central' },
      { name: 'Corpus callosum, mid-anterior', label: 254, colour: [0, 0, 208], freesurfer: 'CC_Mid_Anterior' },
      { name: 'Corpus callosum, anterior', label: 255, colour: [0, 0, 255], freesurfer: 'CC_Anterior' },
    ],
  },
  {
    name: 'Other structures',
    children: [
      bilateral('Vessel', 30, 62, [160, 32, 240], { freesurfer: 'vessel' }),
      { name: 'White matter hypointensities', label: 77, colour: [200, 70, 255], freesurfer: 'WM-hypointensities' },
      { name: 'Optic chiasm', label: 85, colour: [234, 169, 30], freesurfer: 'Optic-Chiasm' },
    ],
  },
];

// The cortex by its gyri and the structures beneath, as an aparc+aseg volume labels them.
export const FREESURFER_APARC_ASEG = new Parcellation({
  id: 'freesurfer-aparc-aseg', name: 'Desikan-Killiany cortex and FreeSurfer subcortical structures (aparc+aseg)', version: 'FreeSurfer',
  species: 'Homo sapiens', modality: 'anatomy', citations: ['Desikan2006', 'Klein2012'],
  description: 'The labels of an aparc+aseg volume: the gyral regions by lobe, and the white matter, subcortical nuclei, cerebellum, brain stem, ventricles and corpus callosum.',
  regions: [{
    name: 'Brain',
    children: [
      {
        name: 'Cerebral cortex',
        children: [
          ...cortexRegions(),
          bilateral('Cerebral cortex, not parcellated', 3, 42, [205, 62, 78], { freesurfer: 'Cerebral-Cortex' }),
        ],
      },
      ...subcortical(),
    ],
  }],
});

// The neuraxis: the divisions of the central nervous system as development
// makes them, from the three primary vesicles of the neural tube.
export const NEURAXIS = new Parcellation({
  id: 'neuraxis', name: 'The neuraxis: the developmental divisions of the central nervous system', species: 'vertebrates', modality: 'development',
  description: 'The forebrain, midbrain and hindbrain of the neural tube and their derivatives, down to the structures the other parcellations name.',
  regions: [{
    name: 'Central nervous system',
    children: [
      {
        name: 'Brain', acronym: 'encephalon',
        children: [
          {
            name: 'Forebrain', acronym: 'prosencephalon',
            children: [
              {
                name: 'Telencephalon', acronym: 'endbrain',
                children: [
                  { name: 'Cerebral cortex', children: [{ name: 'Neocortex', acronym: 'isocortex' }, { name: 'Allocortex', children: [{ name: 'Hippocampal formation' }, { name: 'Olfactory cortex' }] }] },
                  { name: 'Basal ganglia', children: [{ name: 'Striatum', children: [{ name: 'Caudate nucleus' }, { name: 'Putamen' }, { name: 'Nucleus accumbens' }] }, { name: 'Globus pallidus', acronym: 'pallidum' }] },
                  { name: 'Amygdala' }, { name: 'Basal forebrain' }, { name: 'Olfactory bulb' },
                ],
              },
              {
                name: 'Diencephalon', acronym: 'interbrain',
                children: [{ name: 'Thalamus' }, { name: 'Hypothalamus' }, { name: 'Epithalamus', children: [{ name: 'Pineal gland' }, { name: 'Habenula' }] }, { name: 'Subthalamus' }],
              },
            ],
          },
          {
            name: 'Midbrain', acronym: 'mesencephalon',
            children: [
              { name: 'Tectum', children: [{ name: 'Superior colliculus' }, { name: 'Inferior colliculus' }] },
              { name: 'Tegmentum', children: [{ name: 'Substantia nigra' }, { name: 'Red nucleus' }, { name: 'Periaqueductal grey' }, { name: 'Ventral tegmental area' }] },
              { name: 'Cerebral peduncles' },
            ],
          },
          {
            name: 'Hindbrain', acronym: 'rhombencephalon',
            children: [
              { name: 'Metencephalon', children: [{ name: 'Pons' }, { name: 'Cerebellum', children: [{ name: 'Cerebellar cortex' }, { name: 'Deep cerebellar nuclei' }] }] },
              { name: 'Myelencephalon', children: [{ name: 'Medulla oblongata' }] },
            ],
          },
        ],
      },
      {
        name: 'Spinal cord',
        children: [{ name: 'Cervical segments' }, { name: 'Thoracic segments' }, { name: 'Lumbar segments' }, { name: 'Sacral segments' }, { name: 'Coccygeal segment' }],
      },
    ],
  }],
});
