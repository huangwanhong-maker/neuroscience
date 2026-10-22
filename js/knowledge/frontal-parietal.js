// Knowledge of the brain as a whole, the cerebrum, the cerebral cortex, and the frontal
// and parietal lobes with the insula: see ../knowledge.js for the fields and the sources.
// The papers cited here only were checked on Crossref on 2026-10-23.

const doi = (d) => ` <a href="https://doi.org/${d}" target="_blank" rel="noopener">doi:${d}</a>`;

export const REFS = {
  Aron2004: 'Aron, A. R., Robbins, T. W. and Poldrack, R. A. (2004), Inhibition and the right inferior frontal cortex, <i>Trends in Cognitive Sciences</i> 8, 170–177.' + doi('10.1016/j.tics.2004.02.010'),
  Catani2012: 'Catani, M. et al. (2012), Short frontal lobe connections of the human brain, <i>Cortex</i> 48, 273–291.' + doi('10.1016/j.cortex.2011.12.001'),
  Cavanna2006: 'Cavanna, A. E. and Trimble, M. R. (2006), The precuneus: a review of its functional anatomy and behavioural correlates, <i>Brain</i> 129, 564–583.' + doi('10.1093/brain/awl004'),
  Corbetta2002: 'Corbetta, M. and Shulman, G. L. (2002), Control of goal-directed and stimulus-driven attention in the brain, <i>Nature Reviews Neuroscience</i> 3, 201–215.' + doi('10.1038/nrn755'),
  Craig2009: 'Craig, A. D. (2009), How do you feel — now? The anterior insula and human awareness, <i>Nature Reviews Neuroscience</i> 10, 59–70.' + doi('10.1038/nrn2555'),
  Dronkers1996: 'Dronkers, N. F. (1996), A new brain region for coordinating speech articulation, <i>Nature</i> 384, 159–161.' + doi('10.1038/384159a0'),
  duBoisgueheneuc2006: 'du Boisgueheneuc, F. et al. (2006), Functions of the left superior frontal gyrus in humans: a lesion study, <i>Brain</i> 129, 3315–3328.' + doi('10.1093/brain/awl244'),
  Fried1991: 'Fried, I. et al. (1991), Functional organization of human supplementary motor cortex studied by electrical stimulation, <i>Journal of Neuroscience</i> 11, 3656–3666.' + doi('10.1523/jneurosci.11-11-03656.1991'),
  Yousry1997: 'Yousry, T. A. et al. (1997), Localization of the motor hand area to a knob on the precentral gyrus: a new landmark, <i>Brain</i> 120, 141–157.' + doi('10.1093/brain/120.1.141'),
};

export const KNOWLEDGE = {
  // ---- the whole ---------------------------------------------------------------------------------
  brain: {
    latin: 'Encephalon',
    summary: 'The part of the central nervous system within the skull: the cerebrum, the diencephalon, the brainstem and the cerebellum. An adult brain weighs about 1.3–1.4 kg, some 2% of the body, yet uses about a fifth of the body’s oxygen at rest; it holds about 86 billion neurons and a similar number of other cells (Azevedo et al. 2009).',
    location: 'In the cranial cavity, wrapped by three meninges, the dura mater, the arachnoid mater and the pia mater, and floating in cerebrospinal fluid in the subarachnoid space between the last two. Folds of the dura, the falx cerebri and the tentorium cerebelli, separate the hemispheres from each other and from the cerebellum. At the foramen magnum the medulla oblongata continues as the spinal cord.',
    function: [
      'Sensation and movement, through the cranial nerves and the spinal cord.',
      'Homeostasis: the hypothalamus and the brainstem keep breathing, circulation, temperature, hunger and sleep in balance.',
      'Perception, learning, memory, language, emotion and thought, which arise in the cerebral cortex working with the nuclei beneath it.',
    ],
    connections: 'Twelve pairs of cranial nerves leave it, of which the first two, the olfactory and optic nerves, are in truth outgrowths of the brain itself; below, it is continuous with the spinal cord.',
    supply: 'The two internal carotid arteries (the anterior circulation) and the two vertebral arteries, which join as the basilar artery (the posterior circulation), meet in the arterial circle of Willis at the base of the brain; from it arise the anterior, middle and posterior cerebral arteries. The veins drain into the dural venous sinuses and thence into the internal jugular veins.',
    development: 'It grows from the front end of the neural tube, which closes in the fourth week of gestation. Its three primary vesicles, prosencephalon, mesencephalon and rhombencephalon, become five: the telencephalon (the cerebrum), the diencephalon, the mesencephalon (the midbrain), the metencephalon (the pons and cerebellum) and the myelencephalon (the medulla).',
    clinical: 'With almost no store of oxygen or glucose, the brain stops working within seconds when its blood supply fails, and its neurons begin to die within minutes: hence the urgency of treating a stroke. Its diseases range from stroke, trauma and tumours to the epilepsies, the neurodegenerations such as Alzheimer’s and Parkinson’s diseases, and the psychiatric disorders.',
    note: 'The brain drawn here is no single person’s: it is the MNI 152 ICBM 2009c template, the average of the MRI scans of 152 adults brought into register with each other.',
    refs: ['Kandel2021', 'Standring2020', 'Azevedo2009', 'Nieuwenhuys2008'],
  },

  cerebrum: {
    latin: 'Telencephalon (cerebrum)',
    summary: 'The two cerebral hemispheres, the largest part of the human brain: the folded cortex on their surface, the white matter beneath it, and the basal nuclei, hippocampus and amygdala buried within. It carries most of the brain’s mass but under a fifth of its neurons, for most neurons are the small granule cells of the cerebellum (Azevedo et al. 2009).',
    location: 'It fills the upper cranial cavity, above the tentorium cerebelli. The longitudinal fissure, which holds the falx cerebri, divides it into left and right hemispheres, joined in its depth by the corpus callosum and the anterior commissure. The lobes are named after the bones of the skull that cover them.',
    function: [
      'Each hemisphere senses and moves the opposite half of the body, because the main sensory and motor pathways cross the midline.',
      'The hemispheres are specialised: language lies in the left in nearly all right-handers and in most left-handers, while attention to space and the recognition of faces and of the melody of speech lean to the right.',
      'Perception, action, memory, language, emotion and thought arise in its cortex, working in loops with the thalamus, the basal nuclei and the cerebellum.',
    ],
    connections: 'Its white matter has three kinds of fibre: association fibres join regions of one hemisphere; commissural fibres, chiefly the corpus callosum and the anterior commissure, join the two hemispheres; projection fibres, through the internal capsule, join the cortex to the thalamus, the brainstem and the spinal cord.',
    supply: 'The anterior cerebral artery supplies the medial surface of the frontal and parietal lobes; the middle cerebral artery most of the lateral surface, the insula and, through its lenticulostriate branches, the basal nuclei and the internal capsule; the posterior cerebral artery the occipital lobe and the underside of the temporal lobe (Tatu et al. 1998).',
    development: 'The hemispheres grow from the paired telencephalic vesicles. As they expand they curve backwards, then down and forwards around the insula, which stays in place; that is why the lateral ventricle, the caudate nucleus and the fornix all trace the shape of a C.',
    clinical: 'A stroke or a tumour in one hemisphere weakens and numbs the opposite side of the body; in the left it may take language (aphasia), in the right attention to the left half of space (neglect). A swollen hemisphere can herniate under the falx or through the notch of the tentorium and compress the brainstem, which threatens life.',
    refs: ['Kandel2021', 'Standring2020', 'Azevedo2009', 'Tatu1998'],
  },

  'cerebral-cortex': {
    latin: 'Cortex cerebri',
    also: ['pallium', 'the grey matter of the hemispheres'],
    summary: 'The folded sheet of grey matter that covers the cerebral hemispheres, in which perception, action, memory, language and thought are worked out. Folding lets a large sheet fit inside the skull: about two-thirds of its surface lies hidden in the sulci.',
    location: 'It covers every surface of the hemispheres. Its ridges are gyri and its grooves sulci; the deepest and most constant sulci, the lateral, central, parieto-occipital and calcarine, divide it into the frontal, parietal, temporal and occipital lobes, with the limbic lobe on the medial surface and the insula hidden in the lateral sulcus. It is thickest, about 4.5 mm, in the precentral gyrus and thinnest, about 1.5 mm, in the visual cortex of the calcarine sulcus.',
    function: [
      'Neocortex (isocortex), most of the cortex, has six layers: layer IV receives from the thalamus, layers II and III send to other cortical areas, and layers V and VI send to the striatum, the brainstem, the spinal cord and back to the thalamus.',
      'Allocortex, with three layers, forms the hippocampus and the olfactory (piriform) cortex; transitional cortex lies between the two, as in the cingulate and parahippocampal gyri.',
      'It is a mosaic of areas that differ in their layers of cells (their cytoarchitecture, which Brodmann mapped in 1909 and Julich-Brain maps today as probabilities), in their connections and in their functions: primary sensory and motor areas, and association areas between them (Amunts et al. 2020).',
    ],
    connections: 'Its neurons connect overwhelmingly with other cortical neurons, near and far. Beyond the cortex, the thalamus is its chief source of input, and the striatum, the pons, the brainstem and the spinal cord are the targets of its output.',
    supply: 'Branches of the anterior, middle and posterior cerebral arteries run in the pia over its surface and send short penetrating arteries into it. The borders between their territories, the watershed zones, are the first to suffer when the blood pressure falls (Tatu et al. 1998).',
    development: 'Its neurons are born deep, beside the ventricles, and climb along radial glial fibres to the surface, each generation passing the one before: the deep layers form first and the superficial ones last, an inside-out order. Most of its folding happens in the last third of gestation.',
    clinical: 'Failures of neuronal migration cause malformations such as lissencephaly, a smooth brain. In adults the cortex is the seat of most epilepsies, of the losses of language, attention and memory after a stroke, and of the degenerations of Alzheimer’s disease and frontotemporal dementia.',
    note: 'Drawn as a surface made from the grey-matter map of the MNI template; the gyri painted on it are those of the Harvard–Oxford cortical atlas (Makris et al. 2006).',
    refs: ['Kandel2021', 'Standring2020', 'Amunts2020', 'Makris2006', 'Tatu1998'],
  },

  // ---- the frontal lobe ------------------------------------------------------------------------
  'frontal-lobe': {
    latin: 'Lobus frontalis',
    summary: 'The largest lobe, in front of the central sulcus. It moves the body and produces speech, and through its prefrontal cortex it plans, holds goals in mind, restrains impulses and shapes social conduct. It is the last part of the brain to mature.',
    location: 'In front of the central sulcus and above the lateral sulcus. Its lateral surface holds the precentral gyrus and the superior, middle and inferior frontal gyri; its medial surface reaches down to the cingulate sulcus; its orbital surface rests on the roofs of the orbits in the anterior cranial fossa.',
    function: [
      'Primary motor cortex (area 4) on the precentral gyrus, with premotor and supplementary motor cortex (area 6) in front of it.',
      'The frontal eye field, near the junction of the superior frontal and precentral sulci, which moves the eyes at will (Paus 1996).',
      'Broca’s area (areas 44 and 45) in the left inferior frontal gyrus, for speaking.',
      'The prefrontal cortex: working memory, planning, the flexible control of behaviour, decisions by value, and social conduct.',
    ],
    connections: 'The prefrontal cortex is bound to the mediodorsal nucleus of the thalamus and runs loops through the striatum (Alexander et al. 1986). Long association bundles join the lobe to all the others: the superior longitudinal and arcuate fasciculi to the parietal and temporal lobes, the uncinate fasciculus to the temporal pole and amygdala, the inferior fronto-occipital fasciculus to the occipital lobe.',
    supply: 'The anterior cerebral artery supplies its medial surface, the medial part of its orbital surface and a strip along its upper border; the superior division of the middle cerebral artery supplies the rest of its lateral surface (Tatu et al. 1998).',
    development: 'Its fibre bundles are among the last in the brain to mature, still changing into the third decade of life (Lebel et al. 2008).',
    clinical: 'Damage to the prefrontal cortex may spare intelligence yet change the person: apathy and loss of initiative after medial lesions, disinhibition after orbital ones, and disorganised daily life after lesions of the frontal pole and the dorsolateral cortex (Shallice and Burgess 1991). Frontotemporal dementia begins here, and the frontal poles are often bruised in head injuries.',
    refs: ['Kandel2021', 'Alexander1986', 'Paus1996', 'Lebel2008', 'Shallice1991', 'Tatu1998'],
  },

  'frontal-pole': {
    latin: 'Polus frontalis',
    also: ['frontopolar cortex', 'Brodmann area 10'],
    summary: 'The front end of the frontal lobe, largely Brodmann’s area 10, the frontopolar cortex. Relative to the rest of the brain, area 10 is larger in humans than in the great apes (Semendeferi et al. 2001), and it is thought to let us keep one goal in mind while pursuing another.',
    location: 'The most anterior part of the hemisphere, above the orbit and behind the frontal bone and the frontal sinus, where the superior, middle and inferior frontal gyri and the orbital surface converge.',
    function: 'It coordinates several goals at once: keeping an intention pending while doing something else, switching between tasks, and judging one’s own thoughts and memories. Its precise role is still debated; it is among the least understood parts of the cortex.',
    connections: 'Almost entirely with other prefrontal areas and with the association cortex of the temporal lobe, through the uncinate and inferior fronto-occipital fasciculi. It receives little direct sensory input, as suits a region that works on the brain’s own representations.',
    supply: 'The frontopolar branch of the anterior cerebral artery medially, and prefrontal branches of the middle cerebral artery laterally (Tatu et al. 1998).',
    clinical: 'Patients with lesions here may score normally on tests of intelligence yet fail to organise everyday errands with several goals (Shallice and Burgess 1991). With the temporal poles and the orbital surface, the frontal pole is a common site of contusion when the head strikes or is struck.',
    note: 'Harvard–Oxford draws the frontal pole generously: it takes in the anterior ends of the frontal gyri and is larger than area 10.',
    refs: ['Semendeferi2001', 'Shallice1991', 'Kandel2021', 'Tatu1998', 'Makris2006'],
  },

  'superior-frontal-gyrus': {
    latin: 'Gyrus frontalis superior',
    summary: 'The uppermost of the three frontal gyri, running from the frontal pole back to the precentral sulcus along the upper border of the hemisphere and over onto its medial surface. Its front part is prefrontal cortex used in working memory; its back part is premotor.',
    location: 'Between the superior frontal sulcus and the longitudinal fissure. On the medial surface it continues down to the cingulate sulcus, a part sometimes called the medial frontal gyrus; behind it lie the precentral gyrus laterally and the paracentral lobule medially.',
    function: [
      'Its prefrontal part (areas 8 and 9) serves working memory, above all for spatial information and for manipulating what is held in mind (du Boisgueheneuc et al. 2006).',
      'Its posterior part is premotor cortex (area 6): the dorsal premotor area laterally, the supplementary motor area medially.',
      'The frontal eye field lies at its junction with the precentral sulcus (Paus 1996).',
    ],
    connections: 'The superior longitudinal fasciculus joins it to the superior parietal lobule; the frontal aslant tract runs from its posterior medial part down to the inferior frontal gyrus (Catani et al. 2012); the cingulum and the corpus callosum join it to the cingulate gyrus and to its counterpart.',
    supply: 'Mostly the anterior cerebral artery, through the callosomarginal and pericallosal branches that climb over the upper border; its lateral edge borders the territory of the middle cerebral artery (Tatu et al. 1998).',
    clinical: 'Infarcts of the anterior cerebral artery damage it together with the paracentral lobule behind: weakness of the opposite leg, apathy, and on the left a transcortical motor aphasia, in which speech is sparse but repetition preserved. Lesions of the left gyrus impair working memory (du Boisgueheneuc et al. 2006).',
    refs: ['duBoisgueheneuc2006', 'Catani2012', 'Paus1996', 'Tatu1998', 'Kandel2021'],
  },

  'middle-frontal-gyrus': {
    latin: 'Gyrus frontalis medius',
    also: ['dorsolateral prefrontal cortex (in part)'],
    summary: 'The broad middle gyrus of the lateral frontal lobe, the greater part of the dorsolateral prefrontal cortex (areas 9 and 46). It holds information in mind and works on it, plans, and keeps behaviour on course against distraction.',
    location: 'Between the superior and inferior frontal sulci, from the frontal pole back to the precentral sulcus; a shallow middle frontal sulcus often splits it lengthwise.',
    function: [
      'Working memory and its manipulation: holding a number, a place or a rule over seconds and using it.',
      'Cognitive control: planning, choosing between rules, and suppressing habitual responses.',
      'Its posterior part, beside the precentral sulcus, contains part of the frontal eye field and, on the left, a region long associated with handwriting (Exner’s area), an association still debated.',
    ],
    connections: 'The second branch of the superior longitudinal fasciculus joins it to the angular gyrus and the inferior parietal lobule. It exchanges fibres with the mediodorsal nucleus of the thalamus and projects to the head of the caudate nucleus, in the dorsolateral prefrontal loop of the basal ganglia (Alexander et al. 1986).',
    supply: 'Prefrontal and precentral branches of the superior division of the middle cerebral artery (Tatu et al. 1998).',
    clinical: 'Damage leaves a dysexecutive syndrome: poor planning, perseveration, and difficulty in switching between rules. The left dorsolateral prefrontal cortex is the usual target of repetitive transcranial magnetic stimulation for depression that resists medication.',
    refs: ['Alexander1986', 'Kandel2021', 'Blumenfeld2021', 'Tatu1998'],
  },

  'inferior-frontal-gyrus': {
    latin: 'Gyrus frontalis inferior',
    also: ['Broca’s area (its opercular and triangular parts, on the left)'],
    summary: 'The lowest of the three frontal gyri, cut by two short rami of the lateral sulcus into orbital, triangular and opercular parts. In the left hemisphere of most people its opercular and triangular parts form Broca’s area, for speaking and for building sentences.',
    location: 'Between the inferior frontal sulcus and the lateral sulcus. The anterior horizontal ramus of the lateral sulcus separates the pars orbitalis in front from the pars triangularis; the anterior ascending ramus separates the pars triangularis from the pars opercularis, which reaches back to the inferior precentral sulcus. Its parts form the frontal operculum, the lid over the anterior insula.',
    function: [
      'On the left: speech production, phonological and syntactic processing, and the controlled retrieval of words and meanings.',
      'On the right: stopping an action already under way (Aron et al. 2004) and, it is thought, the melody of speech, its prosody.',
    ],
    connections: 'The arcuate fasciculus joins it to the temporal and inferior parietal cortex, the dorsal route of language (Catani et al. 2005); the inferior fronto-occipital and uncinate fasciculi, running through the extreme capsule, form a ventral route; the frontal aslant tract climbs from it to the supplementary motor area (Catani et al. 2012).',
    supply: 'Branches of the superior division of the middle cerebral artery: the lateral orbitofrontal and prefrontal arteries (Tatu et al. 1998).',
    clinical: 'In 1861 Paul Broca described a patient who could say little but “tan”, whose lesion lay here. Broca’s aphasia is effortful, halting speech with simplified grammar and relatively spared comprehension; it lasts only when the lesion also takes the insula, the operculum and the white matter beneath, as in an infarct of the superior division of the middle cerebral artery.',
    note: 'Harvard–Oxford labels only the pars triangularis and the pars opercularis; the pars orbitalis falls within its frontal orbital cortex.',
    refs: ['Catani2005', 'Catani2012', 'Aron2004', 'Blumenfeld2021', 'Tatu1998'],
  },

  'pars-triangularis': {
    latin: 'Pars triangularis gyri frontalis inferioris',
    also: ['Brodmann area 45'],
    summary: 'The triangular middle part of the inferior frontal gyrus, Brodmann’s area 45, the anterior half of Broca’s area. On the left it is engaged above all in retrieving and selecting words and their meanings.',
    location: 'A wedge of cortex between the anterior horizontal and anterior ascending rami of the lateral sulcus, its apex pointing down into the sulcus; the pars orbitalis lies in front of and below it, the pars opercularis behind.',
    function: 'With the pars opercularis it serves speech and syntax. It leans toward meaning, the controlled retrieval and selection of words and concepts, where the pars opercularis leans toward sound and articulation; imaging supports this division of labour, though it is not sharp.',
    inherit: 'inferior-frontal-gyrus',
    refs: ['Amunts2020', 'Kandel2021', 'Catani2005'],
  },

  'pars-opercularis': {
    latin: 'Pars opercularis gyri frontalis inferioris',
    also: ['Brodmann area 44'],
    summary: 'The posterior part of the inferior frontal gyrus, Brodmann’s area 44, the posterior half of Broca’s area. It lies just in front of the face area of the motor cortex and helps to plan the articulation of speech and the structure of sentences.',
    location: 'Between the anterior ascending ramus of the lateral sulcus in front and the inferior precentral sulcus behind. Its lower lip forms part of the frontal operculum over the anterior insula, hence its name (<i>operculum</i>, a lid).',
    function: 'On the left: phonological processing, the planning of articulation, and syntax. It is a likely human counterpart of the monkey’s premotor area F5, where mirror neurons were found, though how far the comparison holds is debated. On the right: the inhibitory control of action.',
    inherit: 'inferior-frontal-gyrus',
    refs: ['Amunts2020', 'Kandel2021', 'Aron2004', 'Catani2012'],
  },

  'precentral-gyrus': {
    latin: 'Gyrus precentralis',
    also: ['primary motor cortex', 'M1', 'Brodmann area 4'],
    summary: 'The gyrus in front of the central sulcus, whose posterior part is the primary motor cortex. It commands the voluntary movements of the opposite side of the body, mapped in order from the toes at the top of the hemisphere to the tongue beside the lateral sulcus (Penfield and Boldrey 1937).',
    location: 'Between the precentral sulcus in front and the central sulcus behind, from the lateral sulcus up over the upper border onto the medial surface, where it forms the front of the paracentral lobule. Its hand area bulges as a knob, an inverted omega in axial section, easily found on MRI (Yousry et al. 1997).',
    function: [
      'The primary motor cortex, area 4, lies mainly on its posterior wall within the central sulcus; it has an anterior part (4a) and a posterior part in the depth of the sulcus (4p) (Geyer et al. 1996).',
      'Its map of the body, the motor homunculus, gives most room to the hand, the face and the tongue, which make the finest movements.',
      'Its neurons encode the force and direction of movements; the largest, the Betz cells of layer V, project to the spinal cord.',
      'Its anterior part, toward the precentral sulcus, is premotor cortex (area 6).',
    ],
    connections: 'Its output descends as the corticospinal and corticobulbar tracts, through the posterior limb and the genu of the internal capsule, to the motor neurons of the spinal cord and the brainstem; it also projects to the putamen, the pons and the red nucleus. It receives from the premotor and supplementary motor areas, from the somatosensory cortex behind it, and from the ventrolateral thalamus, which relays the cerebellum and the basal ganglia.',
    supply: 'Precentral and central (rolandic) branches of the middle cerebral artery over the lateral surface, where the face, hand and arm are mapped; paracentral branches of the anterior cerebral artery on the medial surface, where the leg and foot are (Tatu et al. 1998).',
    clinical: 'A lesion weakens the opposite side of the body with the signs of an upper motor neuron: at first flaccid, later spastic, with brisk reflexes and an extensor plantar response (Babinski’s sign). Strokes of the middle cerebral artery weaken the face and arm more than the leg, those of the anterior cerebral artery the reverse. Seizures that begin here may spread along the homunculus, the Jacksonian march; motor neuron disease destroys its Betz cells.',
    refs: ['Penfield1937', 'Geyer1996', 'Yousry1997', 'Tatu1998', 'Kandel2021'],
  },

  'supplementary-motor-area': {
    also: ['juxtapositional lobule (Harvard–Oxford)', 'SMA and pre-SMA', 'medial area 6'],
    summary: 'The medial part of Brodmann’s area 6, on the inner surface of the superior frontal gyrus. It prepares and starts movements that arise from within rather than in answer to a cue, and strings them into sequences.',
    location: 'On the medial surface of the hemisphere, above the cingulate sulcus and in front of the paracentral lobule. A vertical line through the anterior commissure divides it into the supplementary motor area proper behind and the pre-supplementary motor area in front (Picard and Strick 1996).',
    function: [
      'The SMA proper starts self-initiated movements, orders them in sequences and coordinates the two hands; it contributes to the readiness potential that precedes a voluntary movement.',
      'The pre-SMA learns new sequences, chooses between actions and switches between them, and helps to stop a response.',
      'Electrical stimulation here evokes movements, often of both sides, and at lower intensity an urge to move (Fried et al. 1991).',
    ],
    connections: 'The SMA proper projects to the primary motor cortex, directly to the spinal cord, and to the putamen in the motor loop of the basal ganglia; it receives from the ventrolateral thalamus. The pre-SMA is joined to the prefrontal cortex and the caudate nucleus, and by the frontal aslant tract to the inferior frontal gyrus (Catani et al. 2012). The corpus callosum joins the two sides.',
    supply: 'The callosomarginal and pericallosal branches of the anterior cerebral artery (Tatu et al. 1998).',
    clinical: 'Its resection causes the SMA syndrome: a loss of spontaneous movement on the opposite side and, on the left, of speech, which recovers over weeks. Seizures arising here throw the arms into an asymmetric posture, often while the person stays aware. Damage to the medial frontal cortex can cause the alien hand sign, a hand that acts on its own.',
    note: 'Harvard–Oxford calls it the juxtapositional lobule; its label covers both the SMA proper and the pre-SMA. Terminologia Neuroanatomica has no term for it, as it is a functional area, not a gyrus.',
    refs: ['Picard1996', 'Fried1991', 'Catani2012', 'Tatu1998', 'Kandel2021'],
  },

  'frontal-medial-cortex': {
    also: ['ventromedial prefrontal cortex (vmPFC)', 'gyrus rectus and medial orbital cortex'],
    summary: 'The ventromedial prefrontal cortex: the lowest part of the medial frontal lobe, above the orbits and in front of the genu of the corpus callosum. It weighs options by their expected outcomes, regulates emotion, and guides decisions by their consequences.',
    location: 'On the medial surface, below the paracingulate and cingulate gyri and in front of the subcallosal cortex, curving under onto the orbital surface as the gyrus rectus, medial to the olfactory sulcus.',
    function: [
      'It represents the value of options and of expected outcomes, and so guides choices by their consequences; patients with damage here choose against their own interest in gambling tasks (Bechara et al. 1994).',
      'It regulates emotion, damping the amygdala, as when a fear is extinguished.',
      'It is a node of the default-mode network, active when thinking about oneself and others.',
    ],
    connections: 'It is joined to the amygdala through the uncinate fasciculus, and to the hypothalamus, the periaqueductal grey, the ventral striatum, the mediodorsal thalamus, the hippocampus and the posterior cingulate cortex.',
    supply: 'The medial orbitofrontal and frontopolar branches of the anterior cerebral artery (Tatu et al. 1998).',
    clinical: 'Damage leaves intelligence intact but impairs judgement, planning and social conduct, as in the classic case of Phineas Gage in 1848 and in the patients studied since (Bechara et al. 1994). A ruptured aneurysm of the anterior communicating artery, which lies just below, can leave amnesia with confabulation.',
    note: 'Frontal medial cortex is a region of the Harvard–Oxford atlas, not a term of anatomy: it covers the gyrus rectus and the medial orbital and ventromedial prefrontal cortex below the paracingulate gyrus.',
    refs: ['Bechara1994', 'Kandel2021', 'Tatu1998', 'Makris2006'],
  },

  'frontal-orbital-cortex': {
    latin: 'Gyri orbitales',
    also: ['orbitofrontal cortex (OFC)'],
    summary: 'The underside of the frontal lobe, resting on the roofs of the orbits. It learns and updates what things are worth, above all smells, tastes and rewards, and lets behaviour change when their value changes.',
    location: 'On the orbital surface, lateral to the olfactory sulcus and the gyrus rectus. An H-shaped orbital sulcus divides it into anterior, posterior, medial and lateral orbital gyri; laterally it reaches the pars orbitalis of the inferior frontal gyrus.',
    function: [
      'It represents the reward value of things, such as a food that becomes less pleasant once one is sated.',
      'It updates choices when rewards change, as in reversal learning.',
      'It is secondary olfactory and gustatory cortex, where smell and taste combine into flavour.',
    ],
    connections: 'It receives from the olfactory (piriform) cortex, the gustatory cortex of the insula and operculum, and the visual and somatosensory association areas. The uncinate fasciculus joins it to the amygdala and the temporal pole; it is also joined to the ventral striatum, the mediodorsal thalamus and the hypothalamus.',
    supply: 'The medial orbitofrontal artery, from the anterior cerebral artery, medially; the lateral orbitofrontal artery, from the middle cerebral artery, laterally (Tatu et al. 1998).',
    clinical: 'The orbital surface is bruised against the rough roof of the orbit in head injuries. Damage brings impulsiveness, disinhibition and poor social judgement with intelligence intact; the orbitofrontal–striatal loop is implicated in obsessive–compulsive disorder. A tumour of the olfactory groove beneath it may first show as a loss of smell and a change of personality.',
    note: 'Harvard–Oxford’s frontal orbital cortex includes the orbital gyri and the pars orbitalis of the inferior frontal gyrus.',
    refs: ['Kandel2021', 'Bechara1994', 'Standring2020', 'Tatu1998', 'Makris2006'],
  },

  'frontal-operculum': {
    latin: 'Operculum frontale',
    summary: 'The part of the frontal lobe that overhangs the anterior insula, formed by the inferior frontal gyrus as it folds into the lateral sulcus. With the adjacent anterior insula it holds the primary taste cortex.',
    location: 'The inner, insula-facing surface of the pars opercularis and pars triangularis, within the lateral sulcus, between the free lip of the inferior frontal gyrus and the circular sulcus of the insula.',
    function: 'Taste: the primary gustatory cortex lies in the anterior insula and the adjoining frontal operculum, where taste first reaches awareness. On the left it also takes part in speech, as the deep part of Broca’s region.',
    connections: 'Taste reaches it from the nucleus of the solitary tract through the parvocellular part of the ventral posteromedial nucleus of the thalamus; it passes taste on to the orbitofrontal cortex and the amygdala.',
    supply: 'Opercular branches of the middle cerebral artery, which loop over the operculum as they leave the lateral sulcus (Tatu et al. 1998).',
    clinical: 'Lesions of both anterior opercula cause the Foix–Chavany–Marie syndrome: a loss of voluntary movement of the face, tongue, jaw and throat, so that speech and swallowing fail, while the same muscles still move in yawning and laughing.',
    note: 'Frontal operculum cortex is a label of the Harvard–Oxford atlas: the deep part of the operculum, apart from the pars opercularis on the lateral surface.',
    refs: ['Kandel2021', 'Blumenfeld2021', 'Tatu1998', 'Makris2006'],
  },

  // ---- the parietal lobe -----------------------------------------------------------------------
  'parietal-lobe': {
    latin: 'Lobus parietalis',
    summary: 'The lobe behind the central sulcus. It feels the body, and builds from touch, sight and sound a map of the body and of the space around it, which guides attention and action.',
    location: 'Behind the central sulcus and above the lateral sulcus. Behind, the parieto-occipital sulcus on the medial surface, and on the lateral surface an imaginary line from that sulcus to the preoccipital notch, separate it from the occipital lobe. The intraparietal sulcus divides its lateral surface into the superior and inferior parietal lobules; its medial surface is the precuneus and the back of the paracentral lobule.',
    function: [
      'Somatic sensation, in the primary somatosensory cortex of the postcentral gyrus and the second somatosensory area of the parietal operculum.',
      'Spatial attention and the guidance of action by vision: the dorsal stream, which tells where and how rather than what (Goodale and Milner 1992).',
      'On the left: language, reading, writing, calculation and the planning of skilled movements.',
      'On the right: attention to both halves of space, and awareness of one’s own body.',
    ],
    connections: 'Through the superior longitudinal and arcuate fasciculi it is joined to the frontal lobe, and through the corpus callosum to its counterpart. It receives from the ventral posterior and lateral posterior nuclei and the pulvinar of the thalamus, and from the visual areas along the dorsal stream.',
    supply: 'The middle cerebral artery, by its anterior parietal, posterior parietal and angular branches, supplies most of its lateral surface; the anterior cerebral artery the front of its medial surface and a strip along its upper border; the posterior cerebral artery the back of its medial surface (Tatu et al. 1998).',
    clinical: 'Lesions on the right cause neglect of the left side of space and of the body, often with unawareness of the deficit; lesions on the left cause apraxia, conduction aphasia and, in the angular gyrus, Gerstmann’s syndrome. Bilateral parieto-occipital damage causes Bálint’s syndrome: seeing only one thing at a time, misreaching, and difficulty in directing the gaze. Lesions of the postcentral gyrus impair touch and position sense more than pain.',
    refs: ['Kandel2021', 'Blumenfeld2021', 'Goodale1992', 'Tatu1998'],
  },

  'postcentral-gyrus': {
    latin: 'Gyrus postcentralis',
    also: ['primary somatosensory cortex', 'S1', 'Brodmann areas 3, 1 and 2'],
    summary: 'The gyrus behind the central sulcus: the primary somatosensory cortex. It receives touch, pressure, vibration, the position of the limbs, pain and temperature from the opposite side of the body, laid out as a sensory homunculus that mirrors the motor one in front of it (Penfield and Boldrey 1937).',
    location: 'Between the central sulcus in front and the postcentral sulcus behind, from the lateral sulcus up onto the medial surface, where it forms the back of the paracentral lobule. From front to back it holds area 3a in the fundus of the central sulcus, area 3b on its posterior wall, area 1 on the crown of the gyrus, and area 2 on the anterior wall of the postcentral sulcus.',
    function: [
      'Area 3b is the core of touch; area 1 analyses texture, area 2 size and shape, and area 3a the signals of muscle stretch.',
      'Its map gives most room to the lips, tongue and fingertips, the most finely innervated surfaces.',
      'It passes what it feels on to the second somatosensory area, to the posterior parietal cortex, and forward to the motor cortex.',
    ],
    connections: 'It receives from the ventral posterolateral nucleus of the thalamus (the body, by the medial lemniscus and spinothalamic tract) and the ventral posteromedial nucleus (the face, by the trigeminal pathways). It projects to the parietal operculum, the superior parietal lobule, the primary motor cortex and, through the corpus callosum, to its counterpart.',
    supply: 'The anterior parietal (postcentral) branch of the middle cerebral artery over the lateral surface; the paracentral branches of the anterior cerebral artery on the medial surface, where the leg is mapped (Tatu et al. 1998).',
    clinical: 'A lesion causes a cortical sensory loss on the opposite side: poor position sense and two-point discrimination, inability to recognise objects by touch (astereognosis) or numbers written on the skin (agraphaesthesia), with pain and temperature largely spared. Seizures that begin here cause tingling that may march along the body.',
    refs: ['Penfield1937', 'Kandel2021', 'Purves2018', 'Tatu1998'],
  },

  'superior-parietal-lobule': {
    latin: 'Lobulus parietalis superior',
    also: ['Brodmann areas 5 and 7'],
    summary: 'The upper part of the lateral parietal lobe, above the intraparietal sulcus (areas 5 and 7). It uses sight and the sense of the body’s position to guide the hand and the eyes: reaching, grasping and looking.',
    location: 'Between the postcentral sulcus in front, the intraparietal sulcus below and the parieto-occipital sulcus behind; over the upper border it continues into the precuneus.',
    function: [
      'Reaching and grasping under visual guidance, in the dorsal stream (Goodale and Milner 1992).',
      'Keeping a map of the body’s position, the body schema, and shifting attention from place to place.',
      'Along the intraparietal sulcus, areas specialised for eye movements, reaching and grasping.',
    ],
    connections: 'The first branch of the superior longitudinal fasciculus joins it to the dorsal premotor cortex and the superior frontal gyrus. It receives from the visual areas of the dorsal stream and from the somatosensory cortex, and sends through the pontine nuclei to the cerebellum.',
    supply: 'The posterior parietal branch of the middle cerebral artery laterally; the anterior cerebral artery along its upper edge and the posterior cerebral artery at its back, so that it lies in the watershed between them (Tatu et al. 1998).',
    clinical: 'Damage causes optic ataxia: misreaching for objects that are seen clearly. Bilateral damage, often from watershed infarcts after a fall in blood pressure, causes Bálint’s syndrome, with simultanagnosia and difficulty in directing the gaze.',
    refs: ['Goodale1992', 'Kandel2021', 'Blumenfeld2021', 'Tatu1998'],
  },

  'supramarginal-gyrus': {
    latin: 'Gyrus supramarginalis',
    also: ['Brodmann area 40'],
    summary: 'The anterior part of the inferior parietal lobule, Brodmann’s area 40, arching over the upturned end of the lateral sulcus. On the left it holds speech sounds briefly and plans skilled movements; on the right it serves attention to space and to the body.',
    location: 'Below the intraparietal sulcus and behind the postcentral sulcus, capping the posterior ascending end of the lateral sulcus; the angular gyrus lies behind it.',
    function: [
      'On the left: the phonological store of verbal short-term memory, and decisions about speech sounds.',
      'Praxis: the planning of skilled and learned movements, such as the use of a tool.',
      'At the temporoparietal junction: turning attention toward unexpected events, more on the right (Corbetta and Shulman 2002).',
    ],
    connections: 'The arcuate fasciculus: its anterior segment joins the gyrus to Broca’s area and the precentral gyrus, its posterior segment to the posterior temporal lobe (Catani et al. 2005). The third branch of the superior longitudinal fasciculus joins it to the ventral premotor cortex and the inferior frontal gyrus.',
    supply: 'The anterior and posterior parietal branches of the middle cerebral artery (Tatu et al. 1998).',
    clinical: 'On the left, a lesion of the gyrus and of the arcuate fasciculus beneath it causes conduction aphasia: fluent speech with errors of sound and a striking failure to repeat. It may also cause ideomotor apraxia, the inability to pantomime a gesture on command. On the right, damage contributes to neglect.',
    refs: ['Catani2005', 'Corbetta2002', 'Kandel2021', 'Blumenfeld2021', 'Tatu1998'],
  },

  'supramarginal-gyrus-anterior': {
    summary: 'The front half of the supramarginal gyrus, beside the postcentral gyrus. It joins touch and the position of the hand to action: grasping, and the use of tools.',
    location: 'Behind the postcentral sulcus and above the posterior ramus of the lateral sulcus, in front of the gyrus’s arch around the end of that sulcus.',
    function: 'Somatosensory association: it combines touch and proprioception into a sense of objects in the hand and of the hand itself, and with the premotor cortex it plans skilled movements and the use of tools.',
    note: 'Harvard–Oxford divides the supramarginal gyrus into anterior and posterior divisions by a convention of the atlas, not along a sulcus.',
    inherit: 'supramarginal-gyrus',
    refs: ['Kandel2021', 'Makris2006'],
  },

  'supramarginal-gyrus-posterior': {
    summary: 'The back half of the supramarginal gyrus, where it arches over the upturned end of the lateral sulcus. On the left it holds speech sounds in short-term memory; on both sides it forms part of the temporoparietal junction.',
    location: 'Around the posterior ascending end of the lateral sulcus, in front of the angular gyrus and above the posterior superior temporal gyrus and the planum temporale.',
    function: 'On the left, the phonological store: the brief holding of speech sounds, as when repeating an unfamiliar word. On the right, part of the ventral attention network, which turns attention toward unexpected events (Corbetta and Shulman 2002).',
    note: 'Harvard–Oxford divides the supramarginal gyrus into anterior and posterior divisions by a convention of the atlas, not along a sulcus.',
    inherit: 'supramarginal-gyrus',
    refs: ['Corbetta2002', 'Catani2005', 'Makris2006'],
  },

  'angular-gyrus': {
    latin: 'Gyrus angularis',
    also: ['Brodmann area 39'],
    summary: 'The posterior part of the inferior parietal lobule, Brodmann’s area 39, where vision, hearing and touch meet. On the left it serves reading, writing, calculation and the meaning of words; it is a hub of the default-mode network.',
    location: 'Behind the supramarginal gyrus, arching around the upturned end of the superior temporal sulcus, below the intraparietal sulcus and in front of the lateral occipital cortex.',
    function: [
      'Semantic memory: combining concepts into meaning, in words and in sentences.',
      'Reading and writing, arithmetic facts, and the naming of fingers and of left and right.',
      'Recalling episodes and orienting attention; with the precuneus and the posterior cingulate cortex it belongs to the default-mode network.',
      'Electrical stimulation of the right angular gyrus once evoked the feeling of leaving one’s own body (Blanke et al. 2002).',
    ],
    connections: 'The posterior segment of the arcuate fasciculus joins it to the posterior temporal lobe, and the anterior segment joins the inferior parietal lobule to Broca’s area (Catani et al. 2005). The superior longitudinal fasciculus joins it to the middle frontal gyrus, and the cingulum to the posterior cingulate cortex.',
    supply: 'The angular artery, a terminal branch of the middle cerebral artery, near the border with the territory of the posterior cerebral artery (Tatu et al. 1998).',
    clinical: 'On the left, a lesion can cause Gerstmann’s syndrome (agraphia, acalculia, finger agnosia and confusion of left and right) and alexia with agraphia, which Dejerine described in 1891. On the right, it contributes to neglect.',
    refs: ['Blanke2002', 'Catani2005', 'Kandel2021', 'Blumenfeld2021', 'Tatu1998'],
  },

  precuneus: {
    latin: 'Precuneus',
    summary: 'The medial part of the parietal lobe, hidden between the hemispheres in front of the cuneus. It works in imagery from one’s own point of view, in recalling episodes, and in thinking about oneself.',
    location: 'On the medial surface of the parietal lobe: the marginal ramus of the cingulate sulcus in front, behind the paracentral lobule; the parieto-occipital sulcus behind; and the subparietal sulcus below, which separates it from the posterior cingulate gyrus.',
    function: [
      'Imagery from one’s own point of view: imagining scenes and movements, and shifting attention in space.',
      'Retrieving episodic memories, above all their vivid detail.',
      'Thinking about oneself: with the posterior cingulate cortex it is a hub of the default-mode network, and among the most metabolically active regions of the cortex at rest (Cavanna and Trimble 2006).',
    ],
    connections: 'With the other parietal areas, the posterior cingulate and retrosplenial cortex, the dorsolateral prefrontal cortex, and the lateral posterior nucleus and pulvinar of the thalamus.',
    supply: 'Its anterior part from the precuneal branch of the anterior cerebral artery; its posterior part from the parieto-occipital branch of the posterior cerebral artery (Tatu et al. 1998).',
    clinical: 'In Alzheimer’s disease the precuneus and the posterior cingulate cortex are among the first regions to lose metabolism and to gather amyloid, as PET shows.',
    refs: ['Cavanna2006', 'Kandel2021', 'Tatu1998', 'Duvernoy1999'],
  },

  'central-operculum': {
    also: ['Rolandic operculum', 'subcentral gyrus', 'Brodmann area 43'],
    summary: 'The lip of cortex at the lower end of the central sulcus, where the precentral and postcentral gyri join above the lateral sulcus and fold inward over the middle of the insula. It moves and feels the face, tongue, throat and larynx, for speaking and swallowing.',
    location: 'Below the lower end of the central sulcus, where the subcentral gyrus joins the precentral and postcentral gyri, and on their inner face within the lateral sulcus, between the frontal operculum in front and the parietal operculum behind.',
    function: 'It holds the lowest parts of the motor and sensory homunculi: the face, lips, tongue, jaw, pharynx and larynx (Penfield and Boldrey 1937). Brodmann’s area 43, on the subcentral gyrus, has been associated with taste.',
    connections: 'From the ventral posteromedial nucleus of the thalamus, which relays the sensation of the face and mouth; to the motor nuclei of the cranial nerves through the corticobulbar tract, and to the insula and the other opercula.',
    supply: 'The central (rolandic) branches of the middle cerebral artery as they leave the lateral sulcus (Tatu et al. 1998).',
    clinical: 'Childhood epilepsy with centrotemporal spikes, the commonest focal epilepsy of children, arises here: brief seizures, often in sleep, that twitch one side of the face with drooling and arrest of speech, and that usually cease by adolescence. Damage on both sides causes the opercular syndrome.',
    note: 'Central opercular cortex is a label of the Harvard–Oxford atlas.',
    refs: ['Penfield1937', 'Kandel2021', 'Blumenfeld2021', 'Tatu1998', 'Makris2006'],
  },

  'parietal-operculum': {
    also: ['second somatosensory cortex (S2)', 'areas OP1–OP4'],
    summary: 'The upper lip of the lateral sulcus behind the central operculum, folded inward over the posterior insula. It holds the second somatosensory area, which Eickhoff and colleagues divided by its cells into four areas, OP1 to OP4 (Eickhoff et al. 2006).',
    location: 'The inner face of the parietal lobe within the posterior lateral sulcus: behind the central operculum, and above Heschl’s gyrus and the planum temporale, from which the sulcus separates it.',
    function: [
      'The second somatosensory cortex (S2), thought to lie in OP1, compares and recognises objects by touch, and receives from both sides of the body.',
      'It takes part in the sense of pain and temperature, passing them on to the insula.',
      'OP2, deep in the sulcus, has been linked to the sense of balance.',
    ],
    connections: 'From the primary somatosensory cortex and the ventral posterior thalamus; to the insula, the amygdala and the premotor cortex, and through the corpus callosum to its counterpart.',
    supply: 'Parietal branches of the middle cerebral artery as they emerge from the lateral sulcus (Tatu et al. 1998).',
    clinical: 'Lesions here impair the recognition of objects by touch and can disturb the perception of pain and temperature; with the posterior insula they can leave pain felt but no longer distressing, asymbolia for pain (Berthier et al. 1988).',
    note: 'Parietal operculum cortex is a label of the Harvard–Oxford atlas.',
    refs: ['Eickhoff2006', 'Berthier1988', 'Kandel2021', 'Tatu1998', 'Makris2006'],
  },

  // ---- the insula ------------------------------------------------------------------------------
  insula: {
    latin: 'Insula',
    also: ['insular lobe', 'island of Reil'],
    summary: 'The cortex hidden in the depth of the lateral sulcus, covered by the frontal, parietal and temporal opercula. It reads the state of the body, its heartbeat, breath, gut, pain, temperature and taste, and brings it into feeling and decision.',
    location: 'In the floor of the lateral sulcus, surrounded by the circular sulcus. The central insular sulcus divides its anterior part, usually with three short gyri, from its posterior part, usually with two long gyri. Beneath it lie, in order, the extreme capsule, the claustrum, the external capsule and the putamen.',
    function: [
      'Interoception: the posterior insula maps the state of the body (pain, temperature, itch, heartbeat, breath and gut), and the anterior insula turns that map into feeling (Craig 2009).',
      'Taste: the primary gustatory cortex lies in the anterior insula and the frontal operculum.',
      'Salience and emotion: with the anterior cingulate cortex it detects what matters and turns the brain toward it; it is active in disgust, empathy and craving.',
      'Speech: lesions of the left anterior insula have been tied to apraxia of speech (Dronkers 1996), a claim since debated.',
    ],
    connections: 'It receives from the ventromedial and ventral posterior nuclei of the thalamus, which relay pain, temperature, visceral sensation and taste. It is joined to the amygdala, the anterior cingulate and orbitofrontal cortex, the opercula and the hypothalamus.',
    supply: 'The insular (M2) segments of the middle cerebral artery run over its surface within the lateral sulcus and send short branches into it (Tatu et al. 1998).',
    development: 'It is among the first parts of the cortex to form, but grows more slowly than its neighbours, which fold over it during gestation as the opercula and bury it in the depth of the lateral sulcus.',
    clinical: 'It is involved in most infarcts of the middle cerebral artery, and the early loss of the insular ribbon on CT is one of the first signs of such a stroke. Damage to it has let smokers give up at once, without craving (Naqvi et al. 2007), and can leave pain felt but no longer unpleasant (Berthier et al. 1988). Insular seizures mimic others, with choking, tingling or a racing heart.',
    note: 'In Harvard–Oxford the insula is one label, not divided into its short and long gyri.',
    refs: ['Craig2009', 'Naqvi2007', 'Berthier1988', 'Dronkers1996', 'Tatu1998'],
  },
};
