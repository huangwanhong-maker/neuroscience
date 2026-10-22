// Reference spaces: the coordinate systems in which brains are placed, and the
// template volumes that define them.
//
// A reference space is a convention: where the origin is, which way the axes
// point, in what unit, and for which species. Most are defined by a template, an
// average image whose voxel grid gives the space its canonical sampling. The
// catalogue below records, for each space, its axes, its origin, its templates
// (dimensions and voxel-to-world affines, verified against the files named)
// and its sources. World coordinates are RAS in millimetres throughout the
// domain; a space with other native axes (the Allen CCF: posterior, inferior,
// right, in micrometres) carries the affine that brings it to RAS.
//
// Sources: Talairach and Tournoux (1988); Evans et al. (1993); Mazziotta et al.
// (2001); Holmes et al. (1998); Grabner et al. (2006); Fonov et al. (2011);
// Amunts et al. (2013); Fischl et al. (1999); Wang et al. (2020); Johnson et
// al. (2010); Papp et al. (2014); Kleven et al. (2023). Grids from
// TemplateFlow's template_description.json files and from the files' headers,
// retrieved 2026-10-22 (tests/fixtures/templateflow.json).
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { fromOriginSpacing, fromRows, compose, invert, apply } from './affine.js';

const MNI_LICENCE = 'Copyright (C) 1993-2004 Louis Collins, McConnell Brain Imaging Centre, Montreal Neurological Institute, McGill University; permission to use, copy, modify and distribute for any purpose, with the notice kept.';

// The Allen CCF places voxel (0, 0, 0) at the anterior, superior, left corner of
// the volume, with the first axis running posterior, the second inferior, the
// third to the right (posterior-inferior-right, PIR), in micrometres. In RAS
// millimetres: x = z_ccf / 1000, y = -x_ccf / 1000, z = -y_ccf / 1000.
export const RAS_FROM_CCF = fromRows([[0, 0, 0.001, 0], [-0.001, 0, 0, 0], [0, -0.001, 0, 0]]);
export const CCF_FROM_RAS = invert(RAS_FROM_CCF);
export const ccfToRas = (p) => apply(RAS_FROM_CCF, p);
export const rasToCcf = (p) => apply(CCF_FROM_RAS, p);

// The voxel-to-RAS affine of a CCF volume at `micrometres` per voxel.
export const ccfVoxelAffine = (micrometres) => compose(RAS_FROM_CCF, fromOriginSpacing([0, 0, 0], micrometres));

const grid = (dims, origin, spacing) => ({ dims, spacing: typeof spacing === 'number' ? [spacing, spacing, spacing] : spacing, affine: fromOriginSpacing(origin, spacing) });

export const SPACES = {
  talairach: {
    id: 'talairach', name: 'Talairach and Tournoux (1988)', species: 'Homo sapiens', kind: 'stereotaxic', units: 'mm',
    axes: 'x right, y anterior, z superior; the y axis along the line from the anterior commissure (AC) to the posterior commissure (PC)',
    origin: 'the anterior commissure',
    description: 'The stereotaxic space of the printed atlas, a single brain of a 60-year-old woman, with the proportional grid that scales other brains to it piecewise. Coordinates reported from it reach MNI space only approximately (stereotaxic.js).',
    templates: {}, citations: ['TalairachTournoux1988', 'Lancaster2000'],
  },
  mni305: {
    id: 'mni305', name: 'MNI 305', species: 'Homo sapiens', kind: 'template', units: 'mm',
    axes: 'x right, y anterior, z superior', origin: 'near the anterior commissure, by the average of the 305 brains fitted to the Talairach atlas',
    description: 'The first MNI average: 305 normal MRI volumes, linearly fitted to a Talairach-compatible frame and averaged. The origin of the MNI series.',
    templates: {}, citations: ['Evans1993'], licence: MNI_LICENCE,
  },
  'mni152-lin': {
    id: 'mni152-lin', name: 'MNI 152 linear (ICBM 152)', species: 'Homo sapiens', kind: 'template', units: 'mm',
    axes: 'x right, y anterior, z superior', origin: 'that of MNI 305',
    description: 'The ICBM average of 152 brains, each linearly fitted to MNI 305. Its 1 mm grid of 181 x 217 x 181 voxels from (-90, -126, -72) is the grid of Colin 27 and of the SPM templates.',
    templates: { '1mm': grid([181, 217, 181], [-90, -126, -72], 1), '2mm': grid([91, 109, 91], [-90.5, -126.5, -72.5], 2) },
    templateflow: 'MNI152Lin', citations: ['Mazziotta2001'], licence: MNI_LICENCE,
  },
  colin27: {
    id: 'colin27', name: 'MNI Colin 27', species: 'Homo sapiens', kind: 'template', units: 'mm',
    axes: 'x right, y anterior, z superior', origin: 'that of MNI 305',
    description: 'One individual scanned 27 times, averaged, and fitted to MNI 305: a single brain of high definition on the 1 mm grid of MNI 152 linear. The Julich-Brain maps are published in this space as well as in MNI 152 2009c.',
    templates: { '1mm': grid([181, 217, 181], [-90, -126, -72], 1) },
    source: 'http://packages.bic.mni.mcgill.ca/mni-models/colin27/mni_colin27_1998_nifti.zip (colin27_t1_tal_lin.nii, sform read 2026-10-22)',
    citations: ['Holmes1998'], licence: MNI_LICENCE,
  },
  'mni152-nlin-6-asym': {
    id: 'mni152-nlin-6-asym', name: 'MNI 152 nonlinear, 6th generation (FSL)', species: 'Homo sapiens', kind: 'template', units: 'mm',
    axes: 'x right, y anterior, z superior', origin: 'that of MNI 305',
    description: 'The nonlinear average of the 152 brains distributed with FSL (MNI152_T1_1mm), stored there with its first axis running left; TemplateFlow serves it RAS as MNI152NLin6Asym. FSL and the Harvard-Oxford atlases are in this space.',
    templates: { '1mm': grid([182, 218, 182], [-91, -126, -72], 1), '2mm': grid([91, 109, 91], [-90, -126, -72], 2) },
    templateflow: 'MNI152NLin6Asym', citations: ['Grabner2006', 'Evans2012'], licence: MNI_LICENCE,
  },
  'mni152-nlin-2009c-asym': {
    id: 'mni152-nlin-2009c-asym', name: 'MNI 152 ICBM 2009c nonlinear asymmetric', species: 'Homo sapiens', kind: 'template', units: 'mm',
    axes: 'x right, y anterior, z superior', origin: 'that of MNI 305',
    description: 'The unbiased nonlinear average of the ICBM 152 adults (Fonov et al. 2011), 2009c sampling: the reference space of the EBRAINS human brain atlas and of fMRIPrep, in which Julich-Brain and the Schaefer parcellation are served here.',
    templates: {
      '1mm': grid([193, 229, 193], [-96, -132, -78], 1), '2mm': grid([97, 115, 97], [-96.5, -132.5, -78.5], 2),
      '3mm': grid([65, 77, 65], [-97, -133, -79], 3), '4mm': grid([49, 58, 49], [-97.5, -133.5, -79.5], 4),
    },
    templateflow: 'MNI152NLin2009cAsym', ebrains: 'minds/core/referencespace/v1.0.0/dafcffc5-4826-4bf1-8ff6-46b8a31ff8e2',
    citations: ['Fonov2011'], licence: MNI_LICENCE,
  },
  'mni152-nlin-2009c-sym': {
    id: 'mni152-nlin-2009c-sym', name: 'MNI 152 ICBM 2009c nonlinear symmetric', species: 'Homo sapiens', kind: 'template', units: 'mm',
    axes: 'x right, y anterior, z superior', origin: 'that of MNI 305',
    description: 'The left-right symmetric counterpart of 2009c asymmetric, on the same 1 mm grid.',
    templates: { '1mm': grid([193, 229, 193], [-96, -132, -78], 1) },
    templateflow: 'MNI152NLin2009cSym', citations: ['Fonov2011'], licence: MNI_LICENCE,
  },
  bigbrain: {
    id: 'bigbrain', name: 'BigBrain (2015 release)', species: 'Homo sapiens', kind: 'histological', units: 'mm',
    axes: 'x right, y anterior, z superior', origin: 'the BigBrain volume, aligned to MNI space',
    description: 'One brain cut into 7404 sections of 20 micrometres, stained for cell bodies and reconstructed at 20 micrometre isotropic resolution: the microscopic space of the EBRAINS atlas, where cortical layers and cytoarchitectonic borders are seen directly.',
    templates: {}, ebrains: 'minds/core/referencespace/v1.0.0/a1655b99-82f1-420f-a3c2-fe80fd4c8588', citations: ['Amunts2013'],
  },
  fsaverage: {
    id: 'fsaverage', name: 'fsaverage (FreeSurfer)', species: 'Homo sapiens', kind: 'surface', units: 'mm',
    axes: 'x right, y anterior, z superior (the surface coordinates of FreeSurfer, close to MNI 305)', origin: 'the centre of the conformed 256 mm cube',
    description: 'The average cortical surface of FreeSurfer, on which surface-based parcellations (Desikan-Killiany, Destrieux, HCP-MMP 1.0) are defined vertex by vertex.',
    templates: { '1mm': grid([256, 256, 256], [-128, -128, -128], 1) }, templateflow: 'fsaverage', citations: ['Fischl1999'],
  },
  'allen-ccf-v3': {
    id: 'allen-ccf-v3', name: 'Allen Mouse Brain Common Coordinate Framework v3', species: 'Mus musculus', kind: 'template', units: 'um',
    axes: 'native: x posterior, y inferior, z right (PIR), in micrometres from the anterior, superior, left corner; here brought to RAS millimetres by RAS_FROM_CCF',
    origin: 'the corner of the volume; the CCF has no anatomical origin, and stereotaxic coordinates relative to bregma are a separate fit',
    description: 'The average of 1,675 young adult C57BL/6J mice imaged by serial two-photon tomography, at 10 micrometres, with every voxel labelled by a structure of the Allen ontology (CCFv3, 2017 annotation). Served at 10, 25, 50 and 100 micrometres.',
    templates: {
      '10um': { dims: [1320, 800, 1140], spacing: [10, 10, 10], affine: ccfVoxelAffine(10) },
      '25um': { dims: [528, 320, 456], spacing: [25, 25, 25], affine: ccfVoxelAffine(25) },
      '50um': { dims: [264, 160, 228], spacing: [50, 50, 50], affine: ccfVoxelAffine(50) },
      '100um': { dims: [132, 80, 114], spacing: [100, 100, 100], affine: ccfVoxelAffine(100) },
    },
    nativeFrame: 'PIR', ebrains: 'minds/core/referencespace/v1.0.0/265d32a0-3d84-40a5-926f-bf89f68212b9',
    citations: ['Wang2020'], licence: 'Allen Institute Terms of Use (https://alleninstitute.org/terms-of-use/); cite the Allen Mouse Brain Atlas and Wang et al. (2020).',
    caveat: 'The NRRD headers of the Allen files declare left-posterior-superior; the atlas documentation and the Allen tools (Cell Locator) give PIR, which this catalogue follows.',
  },
  'waxholm-rat': {
    id: 'waxholm-rat', name: 'Waxholm Space of the Sprague Dawley rat', species: 'Rattus norvegicus', kind: 'template', units: 'mm',
    axes: 'x right, y anterior, z superior', origin: 'the anterior commissure at the midline, by the Waxholm Space convention (Johnson et al. 2010)',
    description: 'An ex vivo MRI and DTI template of one adult male rat at 39 micrometres, with 222 structures delineated in version 4 (Kleven et al. 2023). Bregma and lambda are located in it, which ties it to stereotaxic coordinates.',
    templates: {}, ebrains: 'minds/core/referencespace/v1.0.0/d5717c4a-0fa1-46e6-918c-b8003069ade8',
    citations: ['Papp2014', 'Kleven2023', 'Johnson2010'], licence: 'CC BY 4.0',
  },
};

export const space = (id) => SPACES[id] || null;
export const listSpaces = (species) => Object.values(SPACES).filter((s) => !species || s.species === species);
