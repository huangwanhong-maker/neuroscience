// Atlases: for each species, the reference space the brain is shown in and the
// parcellations that divide it, with their sources and licences.
//
// An atlas here is a catalogue entry, not the data: the volumes are fetched by
// the data library into its cache and read by an application, which hands the
// bytes to the readers of this domain (nifti.js, nrrd.js, labels.js). The
// human atlas follows the EBRAINS multilevel human brain atlas of the Human
// Brain Project (Amunts et al. 2020; Dickscheid et al. 2026) in its choice of
// space and of the cytoarchitectonic parcellation, and adds a functional
// parcellation (Schaefer et al. 2018) and the gyral parcellation of FreeSurfer
// (Desikan et al. 2006).
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { SPACES } from './spaces.js';

export const ATLASES = {
  human: {
    id: 'human', name: 'The human brain', species: 'Homo sapiens',
    space: 'mni152-nlin-2009c-asym',
    spaces: ['mni152-nlin-2009c-asym', 'mni152-nlin-6-asym', 'mni152-lin', 'colin27', 'bigbrain', 'fsaverage', 'talairach'],
    template: {
      dataset: 'templateflow-mni152', files: { t1: 'tpl-MNI152NLin2009cAsym_res-01_desc-brain_T1w.nii.gz', mask: 'tpl-MNI152NLin2009cAsym_res-01_desc-brain_mask.nii.gz', head: 'tpl-MNI152NLin2009cAsym_res-01_T1w.nii.gz' },
      resolution: '1mm', citations: ['Fonov2011'],
    },
    parcellations: [
      {
        id: 'julich-brain-3.1', name: 'Julich-Brain cytoarchitectonic atlas, v3.1', modality: 'cytoarchitecture',
        description: 'Cortical areas and subcortical nuclei mapped by cell architecture in ten post-mortem brains, as probability maps; the maximum probability map gives each voxel its most probable area, one volume per hemisphere (207 areas with gap maps in v3.1).',
        dataset: 'ebrains-julich-brain', files: { fragments: ['JulichBrainAtlas_3.1_207areas_MPM_lh_MNI152.nii.gz', 'JulichBrainAtlas_3.1_207areas_MPM_rh_MNI152.nii.gz'], hierarchy: 'julichbrain_v3_1.json', map: 'mni152-jba31-labelled.json' },
        reader: 'siibra', citations: ['Amunts2020', 'Amunts2015', 'Eickhoff2005', 'Dickscheid2026'],
        licence: 'As stated by the EBRAINS Knowledge Graph for the dataset version f1fe19e8-99bd-44bc-9616-a52850680777 (the Julich-Brain maps carry Creative Commons terms with a non-commercial clause); fetched into the cache, not redistributed.',
      },
      {
        id: 'schaefer-2018-100-7', name: 'Schaefer 2018, 100 parcels in 7 networks', modality: 'functional connectivity',
        description: 'The cerebral cortex divided by resting-state functional connectivity into parcels, each within one of the seven networks of Yeo et al. (2011).',
        dataset: 'schaefer-2018', files: { volume: 'tpl-MNI152NLin2009cAsym_res-01_atlas-Schaefer2018_desc-100Parcels7Networks_dseg.nii.gz', table: 'tpl-MNI152NLin2009cAsym_atlas-Schaefer2018_desc-100Parcels7Networks_dseg.tsv' },
        reader: 'schaefer', citations: ['Schaefer2018', 'Yeo2011'], licence: 'MIT (CBIG)',
      },
      {
        id: 'schaefer-2018-400-7', name: 'Schaefer 2018, 400 parcels in 7 networks', modality: 'functional connectivity',
        description: 'The finer division of the same construction, 400 parcels.',
        dataset: 'schaefer-2018', files: { volume: 'tpl-MNI152NLin2009cAsym_res-01_atlas-Schaefer2018_desc-400Parcels7Networks_dseg.nii.gz', table: 'tpl-MNI152NLin2009cAsym_atlas-Schaefer2018_desc-400Parcels7Networks_dseg.tsv' },
        reader: 'schaefer', citations: ['Schaefer2018', 'Yeo2011'], licence: 'MIT (CBIG)',
      },
      {
        id: 'desikan-killiany', name: 'Desikan-Killiany gyral parcellation, with the subcortical structures of FreeSurfer', modality: 'gyral anatomy',
        description: 'The 34 gyral regions of each hemisphere (Desikan et al. 2006), grouped by lobe, and the subcortical structures FreeSurfer labels; built into the domain (anatomy.js) with FreeSurfer’s labels and colours, for use with any aparc+aseg volume.',
        reader: 'built-in', citations: ['Desikan2006', 'Klein2012'], licence: 'The names and labels are facts of the FreeSurfer lookup table; no volume is distributed here.',
      },
    ],
  },
  mouse: {
    id: 'mouse', name: 'The mouse brain', species: 'Mus musculus',
    space: 'allen-ccf-v3', spaces: ['allen-ccf-v3'],
    template: {
      dataset: 'allen-mouse-ccf', files: { template: 'average_template_50.nrrd', templateFine: 'average_template_25.nrrd' }, resolution: '50um', citations: ['Wang2020'],
    },
    parcellations: [
      {
        id: 'allen-ccf-2017', name: 'Allen Mouse Brain Atlas ontology, CCFv3 2017 annotation', modality: 'anatomy',
        description: 'Every voxel of the average brain labelled with the finest structure of the Allen ontology: 43 isocortical areas with their layers, 329 subcortical grey structures, 81 fibre tracts and 8 ventricular structures (Wang et al. 2020), in a tree of 1,327 structures.',
        dataset: 'allen-mouse-ccf', files: { volume: 'annotation_50.nrrd', volumeFine: 'annotation_25.nrrd', hierarchy: 'structure_graph_1.json' },
        reader: 'allen', citations: ['Wang2020', 'Oh2014'], licence: 'Allen Institute Terms of Use; cite the Allen Mouse Brain Atlas.',
      },
    ],
  },
  rat: {
    id: 'rat', name: 'The rat brain', species: 'Rattus norvegicus',
    space: 'waxholm-rat', spaces: ['waxholm-rat'],
    template: null,
    parcellations: [
      {
        id: 'waxholm-v4', name: 'Waxholm Space atlas of the Sprague Dawley rat brain, v4', modality: 'anatomy',
        description: '222 structures delineated in the Waxholm Space MRI and DTI template (Kleven et al. 2023); served by EBRAINS, and to be fetched when the rat joins the application.',
        reader: null, citations: ['Kleven2023', 'Papp2014'], licence: 'CC BY 4.0',
      },
    ],
  },
};

export const atlas = (id) => ATLASES[id] || null;
export const listAtlases = () => Object.values(ATLASES);
export const atlasSpace = (a) => SPACES[a.space];

// The references the catalogue cites, by key: the sources are in the README.
export const CITATIONS = {
  TalairachTournoux1988: 'Talairach, J. and Tournoux, P. (1988), Co-planar Stereotaxic Atlas of the Human Brain, Thieme, Stuttgart.',
  Evans1993: 'Evans, A. C., Collins, D. L., Mills, S. R., Brown, E. D., Kelly, R. L. and Peters, T. M. (1993), 3D statistical neuroanatomical models from 305 MRI volumes, IEEE Nuclear Science Symposium and Medical Imaging Conference, 1813-1817.',
  Mazziotta2001: 'Mazziotta, J. et al. (2001), A probabilistic atlas and reference system for the human brain: International Consortium for Brain Mapping (ICBM), Phil. Trans. R. Soc. Lond. B 356, 1293-1322.',
  Holmes1998: 'Holmes, C. J., Hoge, R., Collins, L., Woods, R., Toga, A. W. and Evans, A. C. (1998), Enhancement of MR images using registration for signal averaging, J. Comput. Assist. Tomogr. 22, 324-333.',
  Grabner2006: 'Grabner, G., Janke, A. L., Budge, M. M., Smith, D., Pruessner, J. and Collins, D. L. (2006), Symmetric atlasing and model based segmentation: an application to the hippocampus in older adults, MICCAI 2006, LNCS 4191, 58-66.',
  Fonov2011: 'Fonov, V., Evans, A. C., Botteron, K., Almli, C. R., McKinstry, R. C. and Collins, D. L. (2011), Unbiased average age-appropriate atlases for pediatric studies, NeuroImage 54, 313-327.',
  Evans2012: 'Evans, A. C., Janke, A. L., Collins, D. L. and Baillet, S. (2012), Brain templates and atlases, NeuroImage 62, 911-922.',
  Amunts2013: 'Amunts, K. et al. (2013), BigBrain: an ultrahigh-resolution 3D human brain model, Science 340, 1472-1475.',
  Amunts2015: 'Amunts, K. and Zilles, K. (2015), Architectonic mapping of the human brain beyond Brodmann, Neuron 88, 1086-1107.',
  Amunts2020: 'Amunts, K., Mohlberg, H., Bludau, S. and Zilles, K. (2020), Julich-Brain: a 3D probabilistic atlas of the human brain’s cytoarchitecture, Science 369, 988-992.',
  Eickhoff2005: 'Eickhoff, S. B., Stephan, K. E., Mohlberg, H., Grefkes, C., Fink, G. R., Amunts, K. and Zilles, K. (2005), A new SPM toolbox for combining probabilistic cytoarchitectonic maps and functional imaging data, NeuroImage 25, 1325-1335.',
  Dickscheid2026: 'Dickscheid, T. et al. (2026), siibra: a software tool suite for realizing a Multilevel Human Brain Atlas from complex data resources, Nature Methods 23, 1647-1658.',
  Fischl1999: 'Fischl, B., Sereno, M. I., Tootell, R. B. H. and Dale, A. M. (1999), High-resolution intersubject averaging and a coordinate system for the cortical surface, Hum. Brain Mapp. 8, 272-284.',
  Desikan2006: 'Desikan, R. S. et al. (2006), An automated labeling system for subdividing the human cerebral cortex on MRI scans into gyral based regions of interest, NeuroImage 31, 968-980.',
  Klein2012: 'Klein, A. and Tourville, J. (2012), 101 labeled brain images and a consistent human cortical labeling protocol, Front. Neurosci. 6, 171.',
  Schaefer2018: 'Schaefer, A., Kong, R., Gordon, E. M., Laumann, T. O., Zuo, X.-N., Holmes, A. J., Eickhoff, S. B. and Yeo, B. T. T. (2018), Local-global parcellation of the human cerebral cortex from intrinsic functional connectivity MRI, Cereb. Cortex 28, 3095-3114.',
  Yeo2011: 'Yeo, B. T. T. et al. (2011), The organization of the human cerebral cortex estimated by intrinsic functional connectivity, J. Neurophysiol. 106, 1125-1165.',
  Wang2020: 'Wang, Q. et al. (2020), The Allen Mouse Brain Common Coordinate Framework: a 3D reference atlas, Cell 181, 936-953.',
  Oh2014: 'Oh, S. W. et al. (2014), A mesoscale connectome of the mouse brain, Nature 508, 207-214.',
  Johnson2010: 'Johnson, G. A., Badea, A., Brandenburg, J., Cofer, G., Fubara, B., Liu, S. and Nissanov, J. (2010), Waxholm Space: an image-based reference for coordinating mouse brain research, NeuroImage 53, 365-372.',
  Papp2014: 'Papp, E. A., Leergaard, T. B., Calabrese, E., Johnson, G. A. and Bjaalie, J. G. (2014), Waxholm Space atlas of the Sprague Dawley rat brain, NeuroImage 97, 374-386.',
  Kleven2023: 'Kleven, H., Bjerke, I. E., Clascá, F., Groenewegen, H. J., Bjaalie, J. G. and Leergaard, T. B. (2023), Waxholm Space atlas of the rat brain: a 3D atlas supporting data analysis and integration, Nature Methods 20, 1822-1829.',
  Lancaster2000: 'Lancaster, J. L. et al. (2000), Automated Talairach atlas labels for functional brain mapping, Hum. Brain Mapp. 10, 120-131.',
  Lancaster2007: 'Lancaster, J. L., Tordesillas-Gutiérrez, D., Martinez, M., Salinas, F., Evans, A., Zilles, K., Mazziotta, J. C. and Fox, P. T. (2007), Bias between MNI and Talairach coordinates analyzed using the ICBM-152 brain template, Hum. Brain Mapp. 28, 1194-1205.',
  Brett2001: 'Brett, M., Christoff, K., Cusack, R. and Lancaster, J. (2001), Using the Talairach atlas with the MNI template, NeuroImage 13, S85; the transform as published on the MRC CBU imaging wiki (imaging.mrc-cbu.cam.ac.uk/imaging/MniTalairach).',
  Jasper1958: 'Jasper, H. H. (1958), The ten-twenty electrode system of the International Federation, Electroencephalogr. Clin. Neurophysiol. 10, 371-375.',
  Oostenveld2001: 'Oostenveld, R. and Praamstra, P. (2001), The five percent electrode system for high-resolution EEG and ERP measurements, Clin. Neurophysiol. 112, 713-719.',
  Perrin1989: 'Perrin, F., Pernier, J., Bertrand, O. and Echallier, J. F. (1989), Spherical splines for scalp potential and current density mapping, Electroencephalogr. Clin. Neurophysiol. 72, 184-187.',
  Umeyama1991: 'Umeyama, S. (1991), Least-squares estimation of transformation parameters between two point patterns, IEEE Trans. Pattern Anal. Mach. Intell. 13, 376-380.',
  // Signals of the brain: theory/forward-and-inverse.md.
  RushDriscoll1968: 'Rush, S. and Driscoll, D. A. (1968), Current distribution in the brain from surface electrodes, Anesth. Analg. 47, 717-723.',
  Frank1952: 'Frank, E. (1952), Electric potential produced by two point current sources in a homogeneous conducting sphere, J. Appl. Phys. 23, 1225-1228.',
  deMunck1988: 'de Munck, J. C. (1988), The potential distribution in a layered anisotropic spheroidal volume conductor, J. Appl. Phys. 64, 464-470.',
  Zhang1995: 'Zhang, Z. (1995), A fast method to compute surface potentials generated by dipoles within multilayer anisotropic spheres, Phys. Med. Biol. 40, 335-349.',
  Sarvas1987: 'Sarvas, J. (1987), Basic mathematical and electromagnetic concepts of the biomagnetic inverse problem, Phys. Med. Biol. 32, 11-22.',
  Hamalainen1993: 'Hämäläinen, M., Hari, R., Ilmoniemi, R. J., Knuutila, J. and Lounasmaa, O. V. (1993), Magnetoencephalography: theory, instrumentation, and applications to noninvasive studies of the working human brain, Rev. Mod. Phys. 65, 413-497.',
  HamalainenIlmoniemi1994: 'Hämäläinen, M. S. and Ilmoniemi, R. J. (1994), Interpreting magnetic fields of the brain: minimum norm estimates, Med. Biol. Eng. Comput. 32, 35-42.',
  Lin2006: 'Lin, F.-H., Witzel, T., Ahlfors, S. P., Stufflebeam, S. M., Belliveau, J. W. and Hämäläinen, M. S. (2006), Assessing and improving the spatial accuracy in MEG source localization by depth-weighted minimum-norm estimates, NeuroImage 31, 160-171.',
  Dale2000: 'Dale, A. M., Liu, A. K., Fischl, B. R., Buckner, R. L., Belliveau, J. W., Lewine, J. D. and Halgren, E. (2000), Dynamic statistical parametric mapping: combining fMRI and MEG for high-resolution imaging of cortical activity, Neuron 26, 55-67.',
  PascualMarqui2002: 'Pascual-Marqui, R. D. (2002), Standardized low-resolution brain electromagnetic tomography (sLORETA): technical details, Methods Find. Exp. Clin. Pharmacol. 24 Suppl. D, 5-12.',
  Welch1967: 'Welch, P. D. (1967), The use of fast Fourier transform for the estimation of power spectra: a method based on time averaging over short, modified periodograms, IEEE Trans. Audio Electroacoust. 15, 70-73.',
  Kane2017: 'Kane, N. et al. (2017), A revised glossary of terms most commonly used by clinical electroencephalographers and updated proposal for the report format of the EEG findings. Revision 2017, Clin. Neurophysiol. Pract. 2, 170-185.',
  Berger1929: 'Berger, H. (1929), Über das Elektrenkephalogramm des Menschen, Arch. Psychiatr. Nervenkr. 87, 527-570.',
  Pfurtscheller1999: 'Pfurtscheller, G. and Lopes da Silva, F. H. (1999), Event-related EEG/MEG synchronization and desynchronization: basic principles, Clin. Neurophysiol. 110, 1842-1857.',
  Friston2007: 'Friston, K. J., Ashburner, J. T., Kiebel, S. J., Nichols, T. E. and Penny, W. D., eds. (2007), Statistical Parametric Mapping: The Analysis of Functional Brain Images, Academic Press, London.',
  KnutssonWestin1993: 'Knutsson, H. and Westin, C.-F. (1993), Normalized and differential convolution, Proc. IEEE Conf. Computer Vision and Pattern Recognition, 515-523.',
  RousseeuwCroux1993: 'Rousseeuw, P. J. and Croux, C. (1993), Alternatives to the median absolute deviation, J. Am. Stat. Assoc. 88, 1273-1283.',
  // Networks of spiking neurons (the C++ module snn/): theory/spiking-networks.md. Checked against Crossref.
  RotterDiesmann1999: 'Rotter, S. and Diesmann, M. (1999), Exact digital simulation of time-invariant linear systems with applications to neuronal modeling, Biol. Cybern. 81, 381-402.',
  VanLoan1978: 'Van Loan, C. F. (1978), Computing integrals involving the matrix exponential, IEEE Trans. Autom. Control 23, 395-404.',
  Morrison2005: 'Morrison, A., Mehring, C., Geisel, T., Aertsen, A. and Diesmann, M. (2005), Advancing the boundaries of high-connectivity network simulation with distributed computing, Neural Comput. 17, 1776-1801.',
  Morrison2008: 'Morrison, A., Diesmann, M. and Gerstner, W. (2008), Phenomenological models of synaptic plasticity based on spike timing, Biol. Cybern. 98, 459-478.',
  Gutig2003: 'Gütig, R., Aharonov, R., Rotter, S. and Sompolinsky, H. (2003), Learning input correlations through nonlinear temporally asymmetric Hebbian plasticity, J. Neurosci. 23, 3697-3714.',
  Song2000: 'Song, S., Miller, K. D. and Abbott, L. F. (2000), Competitive Hebbian learning through spike-timing-dependent synaptic plasticity, Nat. Neurosci. 3, 919-926.',
  vanRossum2000: 'van Rossum, M. C. W., Bi, G. Q. and Turrigiano, G. G. (2000), Stable Hebbian learning from spike timing-dependent plasticity, J. Neurosci. 20, 8812-8821.',
  PfisterGerstner2006: 'Pfister, J.-P. and Gerstner, W. (2006), Triplets of spikes in a model of spike timing-dependent plasticity, J. Neurosci. 26, 9673-9682.',
  TsodyksMarkram1997: 'Tsodyks, M. V. and Markram, H. (1997), The neural code between neocortical pyramidal neurons depends on neurotransmitter release probability, Proc. Natl. Acad. Sci. USA 94, 719-723.',
  Markram1998: 'Markram, H., Wang, Y. and Tsodyks, M. (1998), Differential signaling via the same axon of neocortical pyramidal neurons, Proc. Natl. Acad. Sci. USA 95, 5323-5328.',
  Siegert1951: 'Siegert, A. J. F. (1951), On the first passage time probability problem, Phys. Rev. 81, 617-623.',
  Brunel2000: 'Brunel, N. (2000), Dynamics of sparsely connected networks of excitatory and inhibitory spiking neurons, J. Comput. Neurosci. 8, 183-208.',
  BrunelChance2001: 'Brunel, N., Chance, F. S., Fourcaud, N. and Abbott, L. F. (2001), Effects of synaptic noise and filtering on the frequency response of spiking neurons, Phys. Rev. Lett. 86, 2186-2189.',
  MontbrioPazoRoxin2015: 'Montbrió, E., Pazó, D. and Roxin, A. (2015), Macroscopic description for networks of spiking neurons, Phys. Rev. X 5, 021028.',
  BretteGerstner2005: 'Brette, R. and Gerstner, W. (2005), Adaptive exponential integrate-and-fire model as an effective description of neuronal activity, J. Neurophysiol. 94, 3637-3642.',
  Naud2008: 'Naud, R., Marcille, N., Clopath, C. and Gerstner, W. (2008), Firing patterns in the adaptive exponential integrate-and-fire model, Biol. Cybern. 99, 335-347.',
  Izhikevich2003: 'Izhikevich, E. M. (2003), Simple model of spiking neurons, IEEE Trans. Neural Netw. 14, 1569-1572.',
  HodgkinHuxley1952: 'Hodgkin, A. L. and Huxley, A. F. (1952), A quantitative description of membrane current and its application to conduction and excitation in nerve, J. Physiol. 117, 500-544.',
  Salmon2011: 'Salmon, J. K., Moraes, M. A., Dror, R. O. and Shaw, D. E. (2011), Parallel random numbers: as easy as 1, 2, 3, Proc. SC11, 1-12.',
  Hodgkin1948: 'Hodgkin, A. L. (1948), The local electric changes associated with repetitive action in a non-medullated axon, J. Physiol. 107, 165-181.',
  RinzelErmentrout1998: 'Rinzel, J. and Ermentrout, G. B. (1998), Analysis of neural excitability and oscillations, in Koch, C. and Segev, I. (eds.), Methods in Neuronal Modeling, 2nd ed., MIT Press, 251-292.',
  Goebel2012: 'Goebel, R., Sanfelice, R. G. and Teel, A. R. (2012), Hybrid Dynamical Systems: Modeling, Stability, and Robustness, Princeton University Press.',
  Izhikevich2007: 'Izhikevich, E. M. (2007), Dynamical Systems in Neuroscience: The Geometry of Excitability and Bursting, MIT Press.',
  WangBuzsaki1996: 'Wang, X.-J. and Buzsáki, G. (1996), Gamma oscillation by synaptic inhibition in a hippocampal interneuronal network model, J. Neurosci. 16, 6402-6413.',
  MorrisLecar1981: 'Morris, C. and Lecar, H. (1981), Voltage oscillations in the barnacle giant muscle fiber, Biophys. J. 35, 193-213.',
  FitzHugh1961: 'FitzHugh, R. (1961), Impulses and physiological states in theoretical models of nerve membrane, Biophys. J. 1, 445-466.',
  Nagumo1962: 'Nagumo, J., Arimoto, S. and Yoshizawa, S. (1962), An active pulse transmission line simulating nerve axon, Proc. IRE 50, 2061-2070.',
  Higuchi2024: 'Higuchi, S., Kairat, S., Bohte, S. M. and Otte, S. (2024), Balanced resonate-and-fire neurons, Proc. 41st ICML, PMLR 235, 18305-18323.',
  GoriniKossakowskiSudarshan1976: 'Gorini, V., Kossakowski, A. and Sudarshan, E. C. G. (1976), Completely positive dynamical semigroups of N-level systems, J. Math. Phys. 17, 821-825.',
  Lindblad1976: 'Lindblad, G. (1976), On the generators of quantum dynamical semigroups, Commun. Math. Phys. 48, 119-130.',
  DalibardCastinMolmer1992: 'Dalibard, J., Castin, Y. and Mølmer, K. (1992), Wave-function approach to dissipative processes in quantum optics, Phys. Rev. Lett. 68, 580-583.',
  Carmichael1993: 'Carmichael, H. (1993), An Open Systems Approach to Quantum Optics, Springer.',
  PlenioKnight1998: 'Plenio, M. B. and Knight, P. L. (1998), The quantum-jump approach to dissipative dynamics in quantum optics, Rev. Mod. Phys. 70, 101-144.',
};
