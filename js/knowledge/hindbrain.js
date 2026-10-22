// Knowledge of the brainstem, the cerebellum and the ventricles: see ../knowledge.js for
// the fields and the sources.

const doi = (d) => ` <a href="https://doi.org/${d}" target="_blank" rel="noopener">doi:${d}</a>`;

export const REFS = {
  Marr1969: 'Marr, D. (1969), A theory of cerebellar cortex, <i>Journal of Physiology</i> 202, 437–470.' + doi('10.1113/jphysiol.1969.sp008820'),
  Plaha2005: 'Plaha, P. and Gill, S. S. (2005), Bilateral deep brain stimulation of the pedunculopontine nucleus for Parkinson’s disease, <i>NeuroReport</i> 16, 1883–1887.' + doi('10.1097/01.wnr.0000187637.20771.a0'),
  Wardlaw2013: 'Wardlaw, J. M. et al. (2013), Neuroimaging standards for research into small vessel disease and its contribution to ageing and neurodegeneration, <i>Lancet Neurology</i> 12, 822–838.' + doi('10.1016/s1474-4422(13)70124-8'),
  Weiskrantz1974: 'Weiskrantz, L., Warrington, E. K., Sanders, M. D. and Marshall, J. (1974), Visual capacity in the hemianopic field following a restricted occipital ablation, <i>Brain</i> 97, 709–728.' + doi('10.1093/brain/97.1.709'),
};

export const KNOWLEDGE = {
  // ---- the brainstem -------------------------------------------------------------------------
  brainstem: {
    latin: 'Truncus encephali',
    summary: 'The stalk that joins the forebrain to the spinal cord: midbrain, pons and medulla oblongata. Small as it is, it carries every pathway between the brain and the body, holds the nuclei of ten of the twelve cranial nerves, and keeps us breathing and awake.',
    location: 'In the posterior cranial fossa, resting on the clivus, between the diencephalon above and the spinal cord below the foramen magnum. The cerebellum lies behind it, joined to it by three pairs of peduncles, with the fourth ventricle between them.',
    function: [
      'A conduit: the corticospinal and corticobulbar tracts descend through it, the medial lemniscus and the spinothalamic tract ascend.',
      'The nuclei of cranial nerves III to XII, for the eyes, face, mouth, throat, hearing and balance.',
      'The reticular formation, which sets wakefulness through its ascending projections and governs breathing, heart rate and blood pressure.',
      'The neuromodulatory nuclei: serotonin from the raphe, noradrenaline from the locus coeruleus, dopamine from the midbrain.',
    ],
    connections: 'Above, with the thalamus, hypothalamus and cortex; behind, with the cerebellum through the superior (midbrain), middle (pons) and inferior (medulla) cerebellar peduncles; below, with the spinal cord.',
    supply: 'The vertebral arteries, which join at the lower border of the pons to form the basilar artery. Each level is fed by paramedian branches near the midline, short circumferential branches around the side, and long circumferential branches (the posterior inferior cerebellar, anterior inferior cerebellar and superior cerebellar arteries) that also reach its back (Tatu et al. 1996).',
    development: 'From the mesencephalon and rhombencephalon of the neural tube. Motor neurons arise in the basal plate and sensory ones in the alar plate, on either side of the sulcus limitans; when the tube opens into the fourth ventricle the plates fold outward, which is why cranial nerve nuclei lie in columns, motor medially and sensory laterally.',
    clinical: [
      'A lesion here typically gives a “crossed” picture: cranial nerve signs on the side of the lesion and weakness or sensory loss of the opposite body, because the long tracts cross below it.',
      'Lateral medullary (Wallenberg) syndrome, from occlusion of the vertebral or posterior inferior cerebellar artery: vertigo, ataxia, hoarseness, difficult swallowing, Horner’s syndrome and loss of pain and temperature on the same side of the face and the opposite side of the body.',
      'Locked-in syndrome, from infarction of the ventral pons (often a basilar artery occlusion): paralysis of the limbs and of speech, with consciousness spared and vertical eye movements and blinking preserved.',
      'The tests of brain death are largely tests of brainstem reflexes and breathing.',
    ],
    note: 'FreeSurfer’s segmentation labels the midbrain, pons and medulla as one region, “Brain-Stem”; its upper end, where it meets the diencephalon, is a convention of the segmentation. The nuclei drawn beneath it come from MASSP 2.0.',
    refs: ['Standring2020', 'Blumenfeld2021', 'Haines2018', 'Tatu1996', 'Fischl2002'],
  },

  midbrain: {
    latin: 'Mesencephalon',
    summary: 'The shortest part of the brainstem, between the diencephalon and the pons, built around the narrow cerebral aqueduct. Its nuclei drawn here, from MASSP 2.0, are those that ultra-high-field MRI can see: the substantia nigra, the red nucleus, the ventral tegmental area, the periaqueductal grey and the colliculi.',
    location: 'Its back, the tectum, carries the four colliculi; its middle, the tegmentum, holds the red nucleus, the oculomotor and trochlear nuclei and the reticular formation; its front is the pair of cerebral peduncles (crura cerebri), with the substantia nigra between peduncle and tegmentum and the interpeduncular fossa between the two.',
    function: 'Reflexes and orienting to sight and sound (tectum); eye movements (nuclei of nerves III and IV); the dopamine of movement and reward (substantia nigra, ventral tegmental area); defence and pain control (periaqueductal grey); and the passage of the corticospinal fibres in the peduncles.',
    supply: 'Paramedian branches from the top of the basilar artery and the first segment of the posterior cerebral artery supply its medial part; circumferential branches of the posterior cerebral artery (the collicular and posterior medial choroidal arteries) and the superior cerebellar artery supply its side and back (Tatu et al. 1996).',
    clinical: 'Its syndromes are named by what a small infarct strikes: Weber’s (oculomotor palsy with weakness of the opposite body, from the peduncle), Benedikt’s (oculomotor palsy with tremor and ataxia of the opposite side, from the red nucleus), and Parinaud’s dorsal midbrain syndrome (paralysis of upward gaze), often from a tumour of the pineal region pressing on the tectum.',
    refs: ['Standring2020', 'Blumenfeld2021', 'Tatu1996', 'Bazin2020'],
  },

  'substantia-nigra': {
    latin: 'Substantia nigra',
    also: ['SN'],
    summary: 'The “black substance” of the midbrain, darkened by neuromelanin in its dopamine neurons. Its pars compacta supplies dopamine to the striatum, and its loss is the lesion of Parkinson’s disease; its pars reticulata is, with the internal pallidum, an output nucleus of the basal ganglia.',
    location: 'A crescent in the ventral midbrain, between the cerebral peduncle in front and the tegmentum and red nucleus behind, running the length of the midbrain, from the subthalamic region to the border of the pons. The pars compacta lies dorsally, the pars reticulata ventrally, against the peduncle.',
    function: [
      'Pars compacta: dopamine for the dorsal striatum, enabling the selection and vigour of movement and the learning of habits.',
      'Its dopamine neurons, like those of the ventral tegmental area, fire to unexpected reward and pause when an expected reward fails to come: a reward prediction error (Schultz et al. 1997).',
      'Pars reticulata: tonic GABAergic inhibition of the thalamus, the superior colliculus and the pedunculopontine nucleus, released to let a movement or a saccade through.',
    ],
    connections: 'The pars compacta projects to the caudate and putamen (the nigrostriatal pathway) and receives from the striatum, the pallidum, the subthalamic nucleus and the pedunculopontine nucleus. The pars reticulata receives the direct pathway from the striatum and the subthalamic nucleus, and projects to the ventral anterior and ventrolateral thalamus and to the superior colliculus.',
    supply: 'Paramedian branches from the top of the basilar artery and the first segment of the posterior cerebral artery, and short circumferential branches of the posterior cerebral artery for its lateral part (Tatu et al. 1996).',
    clinical: [
      'Parkinson’s disease: the progressive death of pars compacta neurons, with Lewy bodies, gives slowness, rigidity and tremor at rest. The signs appear only after much of the nucleus has been lost; levodopa replaces the missing dopamine.',
      'Neuromelanin-sensitive and iron-sensitive MRI show its loss, and the absence of the normal “swallow-tail” sign of its dorsolateral part on susceptibility imaging supports the diagnosis.',
      'Drugs that block dopamine receptors (many antipsychotics) can produce a similar picture, drug-induced parkinsonism.',
    ],
    note: 'MASSP 2.0 draws the substantia nigra from 7 T quantitative MRI as one structure, its two parts together. In FreeSurfer’s segmentation it is not separated: it lies within the “ventral diencephalon” label.',
    refs: ['Kandel2021', 'Haines2018', 'Schultz1997', 'Tatu1996', 'Bazin2020'],
  },

  'red-nucleus': {
    latin: 'Nucleus ruber',
    summary: 'An oval nucleus of the midbrain tegmentum, pinkish in the fresh brain from its blood supply and rich in iron, which makes it dark on iron-sensitive MRI. It is a station between the cerebellum, the motor cortex and the inferior olive.',
    location: 'In the tegmentum of the upper midbrain, at the level of the superior colliculus, behind and medial to the substantia nigra. The fibres of the oculomotor nerve pass through and beside it on their way to the interpeduncular fossa.',
    function: 'In humans its large-celled part, the origin of the rubrospinal tract, is small, and most of the nucleus is the small-celled part, which projects to the inferior olive. Through this loop (dentate nucleus, red nucleus, inferior olive and back to the cerebellum) it takes part in the cerebellum’s learning and timing of movement.',
    connections: 'Inputs from the contralateral dentate and interposed nuclei through the superior cerebellar peduncle, which crosses beneath it, and from the motor and premotor cortex. Outputs to the inferior olive by the central tegmental tract and, from the large-celled part, to the opposite spinal cord by the rubrospinal tract.',
    supply: 'Paramedian branches from the top of the basilar artery and the first segment of the posterior cerebral artery (Tatu et al. 1996).',
    clinical: [
      'Benedikt’s syndrome: a lesion of the tegmentum involving the red nucleus and the oculomotor fibres gives an oculomotor palsy with tremor and ataxia of the opposite limbs; Claude’s syndrome is similar, with more ataxia.',
      'Holmes (rubral) tremor: a slow tremor at rest, on posture and on action, after lesions of the cerebellar outflow near it.',
      'A lesion of the loop it shares with the dentate nucleus and the olive can cause the inferior olive to enlarge (hypertrophic olivary degeneration), with palatal tremor.',
    ],
    note: 'Drawn from MASSP 2.0, where its iron makes it one of the clearest nuclei on 7 T quantitative maps. FreeSurfer’s segmentation includes it in the “ventral diencephalon”.',
    refs: ['Standring2020', 'Haines2018', 'Blumenfeld2021', 'Tatu1996', 'Bazin2020'],
  },

  'ventral-tegmental-area': {
    latin: 'Area tegmentalis ventralis',
    also: ['VTA'],
    summary: 'A field of dopamine neurons in the floor of the midbrain, medial to the substantia nigra, from which the mesolimbic and mesocortical dopamine pathways arise. It is central to reward, motivation and learning from outcomes.',
    location: 'Near the midline of the ventral midbrain tegmentum, between the two substantiae nigrae and above the interpeduncular fossa, medial to the red nucleus. It has no sharp border with the substantia nigra; the two are one continuous sheet of dopamine cells.',
    function: [
      'Its dopamine neurons signal the difference between the reward received and the reward expected, a teaching signal for learning (Schultz et al. 1997).',
      'Through the nucleus accumbens it gives incentive and vigour to the pursuit of goals.',
      'It also contains GABA and glutamate neurons, whose roles are still being worked out.',
    ],
    connections: 'Mesolimbic pathway to the nucleus accumbens, the amygdala, the hippocampus and the olfactory tubercle; mesocortical pathway to the prefrontal and anterior cingulate cortex. Inputs from the prefrontal cortex, the lateral hypothalamus, the lateral habenula (via the rostromedial tegmental nucleus), the pedunculopontine and laterodorsal tegmental nuclei, and the accumbens.',
    supply: 'Paramedian branches from the top of the basilar artery and the first segment of the posterior cerebral artery (Tatu et al. 1996).',
    clinical: [
      'Addictive drugs share the property of raising dopamine in the nucleus accumbens, the target of these neurons (Di Chiara and Imperato 1988).',
      'The dopamine hypothesis of psychosis places excess mesolimbic dopamine at the origin of delusions and hallucinations; antipsychotics block the dopamine D2 receptor.',
    ],
    note: 'Drawn from MASSP 2.0. Unlike the iron-rich nuclei beside it, it has no strong contrast on MRI, so its outline is less certain than theirs.',
    refs: ['Kandel2021', 'Haines2018', 'Schultz1997', 'DiChiara1988', 'Bazin2020'],
  },

  'periaqueductal-grey': {
    latin: 'Substantia grisea periaqueductalis',
    also: ['PAG', 'central grey'],
    summary: 'The sleeve of grey matter around the cerebral aqueduct, which organises the body’s responses to threat and pain: fighting, fleeing or freezing, the changes in blood pressure that go with them, and the suppression of pain that lets them happen.',
    location: 'Surrounding the cerebral aqueduct through the length of the midbrain, beneath the colliculi. It is organised in longitudinal columns: dorsomedial, dorsolateral, lateral and ventrolateral.',
    function: [
      'Its lateral columns drive active defence (confrontation or flight), with a rise in blood pressure and a pain suppression that does not depend on opioids.',
      'Its ventrolateral column drives passive coping (freezing, quiescence), with a fall in blood pressure and an opioid-mediated suppression of pain.',
      'It descends through the rostral ventromedial medulla to the dorsal horn of the spinal cord to gate incoming pain; stimulating it in rats allowed surgery without anaesthetic (Reynolds 1969).',
      'It also patterns vocalisation, and controls micturition through the pontine micturition centre.',
    ],
    connections: 'Inputs from the medial prefrontal and cingulate cortex, the amygdala, the hypothalamus, and the spinal cord (the spinomesencephalic tract). Outputs to the rostral ventromedial medulla, the hypothalamus, the thalamus and the autonomic centres of the brainstem.',
    supply: 'Branches of the posterior cerebral artery (the collicular and posterior medial choroidal arteries) and of the superior cerebellar artery (Tatu et al. 1996).',
    clinical: [
      'Stimulation of the periaqueductal and periventricular grey has been used for intractable pain.',
      'Narrowing of the aqueduct it surrounds (aqueductal stenosis) obstructs the flow of cerebrospinal fluid and causes hydrocephalus.',
      'Its region is one of those affected in Wernicke’s encephalopathy, from lack of thiamine.',
    ],
    note: 'MASSP 2.0 draws it as a left and a right half, split at the midline of the aqueduct.',
    refs: ['Kandel2021', 'Haines2018', 'Reynolds1969', 'Tatu1996', 'Bazin2020'],
  },

  'superior-colliculus': {
    latin: 'Colliculus superior',
    also: ['optic tectum'],
    summary: 'The upper pair of the four bumps on the back of the midbrain. It holds a map of the visual world aligned with maps of touch and sound and with a map of eye and head movements, and turns the eyes and head toward what appears.',
    location: 'On the tectum of the midbrain, below the pineal gland and above the inferior colliculus, joined to the lateral geniculate body by the brachium of the superior colliculus.',
    function: [
      'Its superficial layers receive the retina directly and map the opposite visual field.',
      'Its deep layers combine sight, sound and touch and hold a motor map: a site stimulated there gives a saccade of a particular direction and size.',
      'It selects targets for gaze and attention, under the inhibition of the substantia nigra pars reticulata, which is released to let a saccade go.',
    ],
    connections: 'Inputs from the retina, the visual and parietal cortex, the frontal eye fields, the inferior colliculus and the substantia nigra pars reticulata. Outputs to the brainstem centres for horizontal and vertical gaze, to the spinal cord (the tectospinal tract, for head turning), and upward to the pulvinar and the lateral geniculate nucleus.',
    supply: 'The collicular (quadrigeminal) and posterior medial choroidal branches of the posterior cerebral artery, and the superior cerebellar artery (Tatu et al. 1996).',
    clinical: [
      'Parinaud’s (dorsal midbrain) syndrome, typically from a tumour of the pineal region pressing on the tectum and pretectum: paralysis of upward gaze, pupils that react to near vision but not to light, and convergence-retraction nystagmus.',
      'Its route from the retina through the pulvinar to the extrastriate cortex is one of the pathways proposed for “blindsight”, the residual ability to locate stimuli in a field blinded by damage to the primary visual cortex (Weiskrantz et al. 1974); how much each route contributes is debated.',
    ],
    note: 'Drawn from MASSP 2.0.',
    refs: ['Kandel2021', 'Purves2018', 'Weiskrantz1974', 'Tatu1996', 'Bazin2020'],
  },

  'inferior-colliculus': {
    latin: 'Colliculus inferior',
    summary: 'The lower pair of the bumps on the back of the midbrain: the great relay of the ascending auditory pathway, through which nearly all sound information passes on its way to the thalamus.',
    location: 'On the tectum below the superior colliculus; the trochlear nerve leaves the brainstem just beneath it. Its brachium runs forward to the medial geniculate body.',
    function: 'Its central nucleus is laminated by frequency (tonotopic) and brings together the cues for locating a sound (the differences in time and intensity between the two ears, computed in the superior olive) and the spectral cues of the cochlear nuclei. Its outer parts combine sound with touch and drive reflex orienting and startle.',
    connections: 'Inputs from the cochlear nuclei, the superior olivary complex and the nuclei of the lateral lemniscus, and descending fibres from the auditory cortex. Output through its brachium to the medial geniculate nucleus, and to the superior colliculus.',
    supply: 'The collicular branches of the posterior cerebral artery and the superior cerebellar artery (Tatu et al. 1996).',
    clinical: [
      'Wave V of the auditory brainstem response, used to screen the hearing of newborns and to detect tumours of the vestibulocochlear nerve, arises near the lateral lemniscus as it ends in the inferior colliculus.',
      'Isolated lesions are rare; damage to both colliculi can cause a central deafness or difficulty recognising sounds.',
    ],
    note: 'Drawn from MASSP 2.0.',
    refs: ['Purves2018', 'Kandel2021', 'Haines2018', 'Tatu1996', 'Bazin2020'],
  },

  'raphe-reticular': {
    summary: 'Small groups of neurons in the brainstem’s core whose axons reach almost the whole brain: the serotonin neurons of the raphe nuclei and the cholinergic neurons of the pedunculopontine nucleus. Few in number, they set the state of the forebrain: waking, sleep, mood and attention.',
    location: 'The raphe nuclei lie along the midline (raphe is Greek for “seam”) from the midbrain to the medulla; the pedunculopontine nucleus lies in the lateral tegmentum where the midbrain meets the pons. All belong to the reticular formation.',
    function: 'Each projects diffusely, so that a few thousand neurons modulate the excitability of billions; they act less by carrying particular messages than by changing how the circuits they reach respond.',
    note: 'The nuclei drawn are those MASSP 2.0 delineates; the locus coeruleus and the lower raphe nuclei of the pons and medulla are not among them.',
    refs: ['Kandel2021', 'Nieuwenhuys2008', 'Bazin2020'],
  },

  'dorsal-raphe-nucleus': {
    latin: 'Nucleus raphes posterior',
    also: ['dorsal raphe'],
    summary: 'The largest group of serotonin neurons in the brain, on the midline of the midbrain beneath the aqueduct. It supplies serotonin to most of the forebrain and is the principal site of action, through its terminals, of the antidepressants that block the serotonin transporter.',
    location: 'In the midline of the caudal midbrain and upper pons, in the ventral part of the periaqueductal grey, just above the two medial longitudinal fasciculi.',
    function: [
      'Its neurons fire most during waking, less in slow-wave sleep and hardly at all in REM sleep.',
      'Serotonin from it shapes mood, the response to stress, impulse control and patience in waiting for reward.',
    ],
    connections: 'Projects to the cortex, the striatum, the amygdala, the thalamus, the hypothalamus and the substantia nigra; receives from the prefrontal cortex, the lateral habenula, the hypothalamus and other brainstem nuclei. Its own serotonin, through 5-HT1A autoreceptors, restrains its firing.',
    supply: 'Paramedian branches of the basilar artery (Tatu et al. 1996).',
    clinical: 'Selective serotonin reuptake inhibitors block the serotonin transporter on the terminals of these neurons; their effect on mood takes weeks, and how they relieve depression is still debated. Classic psychedelics act on serotonin 5-HT2A receptors in the cortex, downstream of it.',
    note: 'Drawn from MASSP 2.0 as one midline structure.',
    refs: ['Kandel2021', 'Nieuwenhuys2008', 'Tatu1996', 'Bazin2020'],
  },

  'median-raphe-nucleus': {
    latin: 'Nucleus centralis superior',
    also: ['superior central nucleus'],
    summary: 'A midline group of serotonin neurons in the upper pons, below and in front of the dorsal raphe, whose fibres go chiefly to the hippocampus, the septum and the hypothalamus.',
    location: 'On the midline of the rostral pontine tegmentum, ventral to the dorsal raphe nucleus and caudal to the interpeduncular nucleus.',
    function: 'Through its projections to the septum and hippocampus it regulates the hippocampal theta rhythm and, with it, the encoding of memory and the response to stress; like the dorsal raphe, it is most active in waking.',
    connections: 'Outputs to the hippocampus, the medial septum, the hypothalamus and the interpeduncular nucleus; inputs from the lateral habenula, the prefrontal cortex and the hypothalamus.',
    supply: 'Paramedian branches of the basilar artery (Tatu et al. 1996).',
    clinical: 'Its share in the serotonin of the hippocampus makes it a candidate in anxiety and depression, though less studied in people than the dorsal raphe.',
    note: 'Drawn from MASSP 2.0 as one midline structure.',
    refs: ['Nieuwenhuys2008', 'Kandel2021', 'Tatu1996', 'Bazin2020'],
  },

  'pedunculopontine-nucleus': {
    latin: 'Nucleus tegmentalis pedunculopontinus',
    also: ['PPN'],
    summary: 'A cluster of cholinergic, glutamatergic and GABAergic neurons in the upper brainstem, woven into the basal ganglia’s circuits, which takes part in starting and sustaining locomotion, in arousal and in REM sleep.',
    location: 'In the dorsolateral tegmentum at the junction of midbrain and pons, at the level of the inferior colliculus, beside the decussation of the superior cerebellar peduncles.',
    function: [
      'Part of the mesencephalic locomotor region, from which stimulation in animals elicits walking.',
      'Its cholinergic projections to the thalamus and basal forebrain promote waking and the cortical activation of REM sleep.',
      'It takes part in posture, attention and the learning of actions.',
    ],
    connections: 'Reciprocal connections with the basal ganglia: inputs from the internal pallidum, the substantia nigra pars reticulata and the subthalamic nucleus, outputs to the subthalamic nucleus and substantia nigra. Ascending to the thalamus; descending to the reticulospinal neurons of the pons and medulla.',
    supply: 'Branches of the superior cerebellar artery and of the collicular arteries, which supply the lateral tegmentum where it lies (Tatu et al. 1996).',
    clinical: 'Its cholinergic neurons degenerate in Parkinson’s disease and progressive supranuclear palsy, and its loss is linked to falls and freezing of gait. Deep brain stimulation of it for freezing of gait has been tried (Plaha and Gill 2005), with mixed results; it remains experimental.',
    note: 'Drawn from MASSP 2.0; a small nucleus without a sharp border on MRI.',
    refs: ['Haines2018', 'Nieuwenhuys2008', 'Plaha2005', 'Tatu1996', 'Bazin2020'],
  },

  // ---- the cerebellum ------------------------------------------------------------------------
  cerebellum: {
    latin: 'Cerebellum',
    also: ['little brain'],
    summary: 'The “little brain” behind the brainstem, about a tenth of the brain’s weight but holding about four-fifths of its neurons (Azevedo et al. 2009). It makes movement smooth, accurate and well timed by comparing what was intended with what happened, and learns from the difference; it also takes part in thought and emotion.',
    location: 'In the posterior cranial fossa, beneath the tentorium cerebelli, behind the pons and medulla, and roofing the fourth ventricle. A midline vermis joins two hemispheres; the primary fissure separates the anterior from the posterior lobe, and the posterolateral fissure the flocculonodular lobe.',
    function: [
      'Vestibulocerebellum (flocculonodular lobe): balance and the stabilisation of gaze.',
      'Spinocerebellum (vermis and the intermediate zone beside it): posture, gait and the ongoing correction of limb movements.',
      'Cerebrocerebellum (lateral hemispheres): the planning and timing of skilled movement, and, through loops with the prefrontal and parietal cortex, cognition and language.',
      'Motor learning: adapting movements to new conditions, as when one learns to reach while wearing prism glasses.',
    ],
    connections: 'Inputs from the cerebral cortex by way of the pontine nuclei (middle cerebellar peduncle), from the spinal cord, the vestibular nuclei and the inferior olive (inferior peduncle). Output from the deep cerebellar nuclei through the superior peduncle to the opposite red nucleus and thalamus, and from the fastigial nucleus and flocculonodular lobe to the vestibular nuclei.',
    supply: 'Three pairs of arteries: the superior cerebellar artery for its upper surface and most of the deep nuclei, the anterior inferior cerebellar artery for the front of its lower surface and the flocculus, and the posterior inferior cerebellar artery for the lower vermis and the back of its lower surface (Tatu et al. 1996).',
    development: 'From the rhombic lip of the metencephalon. Its granule cells first spread over the surface as an external granular layer and then migrate inward, a process that continues for months after birth; it is among the last parts of the brain to mature.',
    clinical: [
      'A hemisphere lesion causes ataxia on the same side: overshooting (dysmetria), tremor that grows as the target nears, clumsy alternating movements, and a slurred, scanning speech. The side is the same because its output crosses twice before reaching the spinal cord.',
      'A lesion of the vermis causes a broad, unsteady gait and trunk ataxia, as in the alcoholic degeneration of its anterior lobe.',
      'Its damage can also blunt executive function, language and affect: the cerebellar cognitive affective syndrome (Schmahmann and Sherman 1998).',
      'Swelling after a cerebellar stroke can compress the brainstem and fourth ventricle and needs urgent surgery; its tonsils can herniate through the foramen magnum.',
    ],
    refs: ['Kandel2021', 'Standring2020', 'Azevedo2009', 'Schmahmann1998', 'Tatu1996'],
  },

  'cerebellar-cortex': {
    latin: 'Cortex cerebelli',
    summary: 'The thin, intricately folded grey sheet of the cerebellum, whose uniform circuit is repeated across its whole surface. It holds the granule cells, the most numerous neurons of the brain, and the Purkinje cells, its only output.',
    location: 'The surface of the cerebellum, folded into thin parallel folia, so that most of it is hidden in the depths of its fissures.',
    function: 'Three layers: the molecular layer outside, the single row of Purkinje cells, and the granular layer within. Mossy fibres from the pons, spinal cord and vestibular nuclei excite granule cells, whose parallel fibres cross the dendrites of many Purkinje cells; each Purkinje cell also receives one climbing fibre from the inferior olive. In the theory of Marr (1969), Albus and Ito, the climbing fibre carries an error signal that weakens the parallel-fibre synapses active with it, and this is how the cerebellum learns.',
    connections: 'The Purkinje cells, which are inhibitory, project to the deep cerebellar nuclei and, from the flocculonodular lobe, to the vestibular nuclei. The cortex is organised in sagittal zones, each projecting to one deep nucleus.',
    inherit: 'cerebellum',
    note: 'The surface is made here from the template’s tissue maps; its label is FreeSurfer’s “Cerebellum-Cortex”, the grey matter of the folia.',
    refs: ['Kandel2021', 'Marr1969', 'Standring2020', 'Fischl2002'],
  },

  'cerebellar-white-matter': {
    latin: 'Corpus medullare cerebelli',
    also: ['arbor vitae'],
    summary: 'The white core of the cerebellum, which in a midline section branches into every folium like a tree: the arbor vitae, “tree of life”, of the old anatomists. It carries the fibres into and out of the cerebellar cortex, and holds the deep cerebellar nuclei.',
    location: 'Within each hemisphere and the vermis, continuous with the three cerebellar peduncles that join the cerebellum to the brainstem.',
    function: 'It carries mossy and climbing fibres into the cortex and the axons of Purkinje cells out to the deep nuclei, and the axons of the deep nuclei out into the superior peduncle.',
    connections: 'Through the superior peduncle with the midbrain (mainly outgoing), the middle peduncle with the pons (incoming from the cortex by the pontine nuclei) and the inferior peduncle with the medulla (incoming from the spinal cord and inferior olive, and the vestibular connections).',
    inherit: 'cerebellum',
    clinical: 'Multiple sclerosis often places plaques in the cerebellar white matter and peduncles. A bright signal of the middle cerebellar peduncles on T2-weighted MRI is a sign of the fragile X–associated tremor/ataxia syndrome and of the cerebellar form of multiple system atrophy.',
    note: 'FreeSurfer’s “Cerebellum-White-Matter” label; it does not separate the deep nuclei, which lie within it and are drawn here from Julich-Brain.',
    refs: ['Standring2020', 'Haines2018', 'Fischl2002'],
  },

  'cerebellar-nuclei': {
    latin: 'Nuclei cerebelli',
    also: ['deep cerebellar nuclei'],
    summary: 'Four pairs of nuclei in the cerebellar white matter that carry nearly all of its output. From lateral to medial: the dentate, emboliform, globose and fastigial nuclei; the emboliform and globose together are the interposed nucleus.',
    location: 'Embedded in the white matter of each half of the cerebellum, close to the roof of the fourth ventricle, the fastigial nucleus nearest the midline.',
    function: 'Each nucleus is the output of one longitudinal zone of the cortex: the fastigial of the vermis, the interposed of the intermediate zone, the dentate of the lateral hemisphere. Excited by collaterals of the mossy and climbing fibres and shaped by the inhibition of the Purkinje cells, they send the cerebellum’s result to the brainstem and thalamus.',
    connections: 'The dentate and interposed nuclei project through the superior cerebellar peduncle, which crosses in the midbrain, to the opposite red nucleus and ventrolateral thalamus; the fastigial nucleus projects to the vestibular nuclei and reticular formation of both sides.',
    supply: 'Chiefly the superior cerebellar artery (Tatu et al. 1996).',
    development: 'Their neurons are among the first of the cerebellum to be born: the excitatory ones from the rhombic lip, the inhibitory ones from the ventricular zone of the cerebellar plate.',
    clinical: 'Damage to them, or to the superior cerebellar peduncle that carries their output, causes the same ataxia as damage to the cortex, often more severe and lasting, since there is no other route out.',
    note: 'The three nuclei drawn are the maximum probability maps of Julich-Brain 3.1, made from ten post-mortem brains, with the emboliform and globose nuclei mapped as one interposed nucleus.',
    refs: ['Standring2020', 'Haines2018', 'Tatu1996', 'Amunts2020'],
  },

  'dentate-nucleus': {
    latin: 'Nucleus dentatus',
    summary: 'The largest of the deep cerebellar nuclei: a thin, folded band of grey matter shaped like a crumpled purse, with an opening (the hilum) facing forward and inward, through which its fibres leave. It is the output of the lateral cerebellar hemisphere.',
    location: 'In the white matter of each cerebellar hemisphere, lateral to the interposed nucleus, beside the roof of the fourth ventricle.',
    function: 'It contributes to the planning and timing of voluntary, especially skilled, movements; its ventral part projects to prefrontal and posterior parietal cortex, so that it also has a share in cognition (Dum and Strick 2003).',
    connections: 'From the Purkinje cells of the lateral hemisphere, and collaterals of mossy and climbing fibres. Its axons leave through the hilum into the superior cerebellar peduncle, cross in the midbrain, and end in the small-celled red nucleus and the ventrolateral thalamus, which project to motor, premotor and prefrontal cortex.',
    clinical: [
      'Its loss gives limb ataxia and intention tremor; it is affected in Friedreich’s ataxia and in dentatorubral-pallidoluysian atrophy.',
      'After repeated doses of some linear gadolinium contrast agents, the dentate nucleus shows a bright signal on T1-weighted MRI: gadolinium is retained there (Kanda et al. 2014).',
    ],
    inherit: 'cerebellar-nuclei',
    note: 'Julich-Brain 3.1’s maximum probability map.',
    refs: ['Standring2020', 'Dum2003', 'Kanda2014', 'Amunts2020'],
  },

  'interposed-nucleus': {
    latin: 'Nuclei interpositi (nucleus emboliformis, nucleus globosus)',
    also: ['emboliform and globose nuclei'],
    summary: 'The two small nuclei between the dentate and the fastigial nucleus, the emboliform (“plug-shaped”, at the hilum of the dentate) and the globose (“rounded”), taken together. They are the output of the intermediate zone beside the vermis.',
    location: 'In the cerebellar white matter, medial to the dentate nucleus, the emboliform at its hilum and the globose medial to it, lateral to the fastigial nucleus.',
    function: 'The control and correction of ongoing limb movements, using spinal information about the movement as it unfolds; they take part in learned reflexes such as the conditioned eye blink.',
    connections: 'From the Purkinje cells of the intermediate zone. Through the superior cerebellar peduncle to the opposite large-celled red nucleus, origin of the rubrospinal tract, and the ventrolateral thalamus.',
    clinical: 'Damage contributes to limb ataxia and tremor on the same side; isolated lesions are rare.',
    inherit: 'cerebellar-nuclei',
    note: 'Julich-Brain maps the emboliform and globose nuclei as one structure, the interposed nucleus, as is usual in the physiology of other mammals, where they are anterior and posterior interposed nuclei.',
    refs: ['Standring2020', 'Kandel2021', 'Amunts2020'],
  },

  'fastigial-nucleus': {
    latin: 'Nucleus fastigii',
    summary: 'The most medial of the deep cerebellar nuclei, beneath the peak (fastigium) of the roof of the fourth ventricle. It is the output of the vermis, for balance, posture, gait and the accuracy of eye movements.',
    location: 'Close to the midline in the roof of the fourth ventricle, in the white matter of the vermis, medial to the globose nucleus.',
    function: 'It adjusts posture and balance through the vestibular nuclei and the reticular formation, and its caudal part, the fastigial oculomotor region, keeps saccades accurate.',
    connections: 'From the Purkinje cells of the vermis. To the vestibular nuclei and the reticular formation of both sides, many fibres crossing within the cerebellum (the uncinate fasciculus of Russell); a smaller projection to the thalamus.',
    clinical: 'Lesions cause unsteady stance and gait with little limb ataxia, and saccades that overshoot or undershoot (saccadic dysmetria).',
    inherit: 'cerebellar-nuclei',
    note: 'Julich-Brain 3.1’s maximum probability map.',
    refs: ['Standring2020', 'Haines2018', 'Kandel2021', 'Amunts2020'],
  },

  // ---- the ventricles ------------------------------------------------------------------------
  'ventricular-system': {
    summary: 'Four connected cavities inside the brain, the remains of the hollow neural tube, filled with cerebrospinal fluid: two lateral ventricles, the third ventricle and the fourth. The fluid flows through them and out into the space around the brain.',
    location: 'The lateral ventricles lie in the hemispheres and open through the interventricular foramina (of Monro) into the third ventricle, a midline slit in the diencephalon. The cerebral aqueduct leads through the midbrain to the fourth ventricle, between the pons and medulla and the cerebellum, which opens into the subarachnoid space through its median aperture (of Magendie) and two lateral apertures (of Luschka).',
    function: 'The choroid plexus in the ventricles secretes about 500 mL of cerebrospinal fluid a day, renewing the roughly 150 mL in the ventricles and around the brain and spinal cord several times daily. The fluid buoys the brain, cushions it, and carries away its wastes.',
    development: 'The cavities of the five brain vesicles: the lateral ventricles of the telencephalon, the third of the diencephalon, the aqueduct of the mesencephalon, the fourth of the rhombencephalon.',
    clinical: [
      'Hydrocephalus: if the flow is blocked (most often at the narrow aqueduct or the outlets of the fourth ventricle), the ventricles above the block enlarge and the pressure rises; if absorption fails, all enlarge.',
      'Normal-pressure hydrocephalus of older people gives a triad of unsteady gait, urinary incontinence and dementia, and may improve when fluid is drained.',
      'The ventricles also enlarge passively as the brain shrinks with age and in neurodegenerative disease.',
    ],
    refs: ['Standring2020', 'Kandel2021', 'Blumenfeld2021'],
  },

  'lateral-ventricle': {
    latin: 'Ventriculus lateralis',
    summary: 'The large C-shaped cavity in each cerebral hemisphere, following the arc of the hemisphere’s growth from the frontal lobe back and down into the temporal lobe. It holds most of the ventricular fluid.',
    location: 'Its frontal horn lies in the frontal lobe, its body under the corpus callosum, its atrium (trigone) at the junction with the occipital horn behind and the temporal horn below. The corpus callosum forms its roof; the septum pellucidum separates the two frontal horns and bodies; the caudate nucleus and the thalamus form its floor and lateral wall, and the fornix its medial edge.',
    function: 'The choroid plexus along its body, atrium and temporal horn secretes cerebrospinal fluid, which leaves through the interventricular foramen (of Monro) for the third ventricle. The frontal and occipital horns have no plexus.',
    connections: 'Through the interventricular foramen with the third ventricle.',
    development: 'The cavity of the telencephalic vesicle; it takes its C shape as the hemisphere grows forward, up, back and down around the insula. The germinal zones in its walls produced the neurons of the cortex.',
    clinical: [
      'The two are often slightly unequal in size, as a normal variant.',
      'They enlarge in hydrocephalus and with atrophy of the brain; on average they are enlarged in schizophrenia.',
      'In infants born very early, bleeding from the germinal matrix beside them (intraventricular haemorrhage) can lead to hydrocephalus.',
    ],
    note: 'FreeSurfer’s “Lateral-Ventricle” label: the frontal and occipital horns, the body and the atrium. The temporal horn is a separate label, drawn here as the inferior horn.',
    refs: ['Standring2020', 'Duvernoy1999', 'Blumenfeld2021', 'Fischl2002'],
  },

  'inferior-horn': {
    latin: 'Cornu temporale (cornu inferius)',
    also: ['temporal horn'],
    summary: 'The part of the lateral ventricle that curves down and forward into the temporal lobe. The hippocampus bulges into its floor, so that its width is a sensitive sign of hippocampal atrophy.',
    location: 'In the medial temporal lobe, from the atrium forward to just behind the amygdala. The hippocampus forms its floor and medial wall; the tail of the caudate nucleus and the stria terminalis run along its roof, beneath the white matter of the temporal lobe.',
    function: 'Its choroid plexus, continuous with that of the atrium, enters through the choroid fissure, the slit between the fimbria of the hippocampus and the thalamus.',
    clinical: [
      'Its widening, with the choroid fissure, is a sign of medial temporal atrophy, as in Alzheimer’s disease, and is graded in visual rating scales of MRI.',
      'It is also among the first parts of the ventricles to dilate in obstructive hydrocephalus.',
    ],
    inherit: 'lateral-ventricle',
    note: 'FreeSurfer’s “Inf-Lat-Vent” label; the template, an average of 152 brains, shows it only as a thin cleft.',
    refs: ['Duvernoy2013', 'Standring2020', 'Fischl2002'],
  },

  'third-ventricle': {
    latin: 'Ventriculus tertius',
    summary: 'A narrow midline slit between the two halves of the diencephalon, joining the lateral ventricles above to the cerebral aqueduct behind. Its walls are the thalamus and hypothalamus.',
    location: 'Its lateral walls are the thalami above and the hypothalami below, crossed in most people by the interthalamic adhesion. Its anterior wall is the lamina terminalis; its floor holds the optic chiasm, the infundibulum of the pituitary stalk, the tuber cinereum and the mammillary bodies; its roof is a thin membrane bearing choroid plexus. Recesses reach above the optic chiasm, into the infundibulum and into the stalk of the pineal gland.',
    function: 'It passes cerebrospinal fluid from the interventricular foramina to the cerebral aqueduct, and its plexus adds to the fluid. Circumventricular organs in its walls, outside the blood–brain barrier, let the hypothalamus sense the blood.',
    development: 'The cavity of the diencephalon.',
    clinical: [
      'A colloid cyst at the interventricular foramen can suddenly block both foramina, causing acute hydrocephalus.',
      'Endoscopic third ventriculostomy opens its floor to bypass an obstruction of the aqueduct.',
      'Tumours of the sellar region, such as craniopharyngioma, can grow up into it.',
    ],
    note: 'FreeSurfer’s “3rd-Ventricle” label.',
    refs: ['Standring2020', 'Duvernoy1999', 'Blumenfeld2021', 'Fischl2002'],
  },

  'fourth-ventricle': {
    latin: 'Ventriculus quartus',
    summary: 'A tent-shaped cavity between the brainstem and the cerebellum, whose floor, the rhomboid fossa, is the back of the pons and upper medulla. It is the last ventricle, from which cerebrospinal fluid leaves for the subarachnoid space.',
    location: 'Its floor is the back of the pons and upper medulla; its roof rises to a peak (the fastigium) beneath the cerebellum, formed by the superior and inferior medullary vela. It receives the aqueduct above and narrows into the central canal below; it opens through a median aperture (of Magendie) and, at the ends of its lateral recesses, two lateral apertures (of Luschka).',
    function: 'Its floor shows the nuclei beneath: the facial colliculus (the abducens nucleus wrapped by the facial nerve), the hypoglossal and vagal trigones, and the area postrema, a circumventricular organ that triggers vomiting in response to toxins in the blood.',
    development: 'The cavity of the rhombencephalon, whose roof plate stretches thin as the alar plates open outward.',
    clinical: [
      'In children, medulloblastoma and ependymoma often arise in or near it and obstruct the flow of fluid.',
      'Malformations of the hindbrain (Dandy–Walker, Chiari) involve its outlets.',
      'Swelling of the cerebellum after stroke or haemorrhage compresses it and causes hydrocephalus.',
    ],
    note: 'FreeSurfer’s “4th-Ventricle” label.',
    refs: ['Standring2020', 'Haines2018', 'Blumenfeld2021', 'Fischl2002'],
  },

  'choroid-plexus': {
    latin: 'Plexus choroideus',
    summary: 'Fronds of tiny vessels covered with a secretory epithelium, which hang into the ventricles and make most of the cerebrospinal fluid. The tight junctions of its epithelium form the blood–cerebrospinal fluid barrier.',
    location: 'In the body, atrium and temporal horn of each lateral ventricle, along the roof of the third ventricle, and in the roof of the fourth. The tuft in the atrium, the glomus, is its largest part.',
    function: 'Secretes cerebrospinal fluid, about 500 mL a day, by the active transport of sodium, chloride and bicarbonate with water following; it also transports nutrients and makes transthyretin, which carries thyroid hormone into the fluid.',
    supply: 'The anterior choroidal artery (from the internal carotid) and the posterior lateral choroidal arteries (from the posterior cerebral) for the plexus of the lateral ventricles; the posterior medial choroidal artery for the third ventricle; the posterior inferior cerebellar artery for the fourth (Tatu et al. 1998).',
    clinical: [
      'The glomus is often calcified in adults, a harmless finding on CT.',
      'Choroid plexus papilloma, mostly in children, can cause hydrocephalus partly by producing too much fluid.',
      'Small cysts of the plexus seen on fetal ultrasound are usually harmless and disappear.',
    ],
    note: 'FreeSurfer labels only the choroid plexus of the lateral ventricles.',
    refs: ['Standring2020', 'Kandel2021', 'Tatu1998', 'Fischl2002'],
  },

  csf: {
    latin: 'Liquor cerebrospinalis',
    summary: 'The clear fluid that bathes the brain and spinal cord: here, the fluid outside the ventricles, in the subarachnoid space between the arachnoid and the pia mater, which widens into cisterns around the base of the brain.',
    location: 'Around the whole brain, deepest in the cisterns: the cisterna magna behind the medulla, the prepontine and interpeduncular cisterns in front of the brainstem, the ambient cistern around the midbrain, and the chiasmatic cistern around the optic chiasm. The main arteries of the brain run within it.',
    function: 'It floats the brain, reducing its effective weight to a small fraction, cushions it, and drains away its wastes. It leaves through the arachnoid granulations into the venous sinuses and along routes by the cranial and spinal nerves and the meningeal lymphatics; the relative share of each, and the “glymphatic” flow of fluid through the brain itself, are debated.',
    clinical: [
      'A lumbar puncture samples it below the end of the spinal cord, for the diagnosis of meningitis, subarachnoid haemorrhage and inflammatory disease.',
      'Bleeding into the subarachnoid space, usually from a ruptured aneurysm, causes a sudden, severe headache.',
    ],
    note: 'FreeSurfer’s “CSF” label (24) marks only the fluid outside the ventricles that falls within its segmentation, mainly near the base of the brain; most of the fluid over the convexity is not labelled.',
    refs: ['Standring2020', 'Kandel2021', 'Blumenfeld2021', 'Fischl2002'],
  },

  // ---- other labels of the segmentation --------------------------------------------------------
  other: {
    summary: 'The remaining labels of FreeSurfer’s segmentation of the template: vessels and lesions of the white matter, which are not structures of the brain but what an MRI of it shows.',
    note: 'Kept so that every value of the joined label volume has a name; they are hidden by default.',
    refs: ['Fischl2002'],
  },

  vessel: {
    summary: 'Small regions labelled as blood vessel by FreeSurfer’s segmentation, chiefly at the base of the basal ganglia, where the lenticulostriate arteries enter the brain through the anterior perforated substance.',
    location: 'Beneath and beside the putamen and pallidum, at the anterior perforated substance.',
    clinical: 'The lenticulostriate arteries, small branches of the middle cerebral artery, supply the basal ganglia and the internal capsule; their occlusion causes small (lacunar) infarcts, and their rupture in long-standing hypertension causes haemorrhage in the putamen, the commonest site of hypertensive bleeding.',
    note: 'FreeSurfer’s “vessel” label: voxels whose intensity resembles neither grey nor white matter, mostly vessels and the spaces around them. In a template it marks where the average shows them.',
    refs: ['Fischl2002', 'Tatu1998', 'Blumenfeld2021'],
  },

  'white-matter-hypointensities': {
    also: ['white-matter hyperintensities', 'leukoaraiosis'],
    summary: 'Patches of white matter darker than normal on T1-weighted MRI, the same lesions that appear bright on T2-weighted and FLAIR images. In ageing they are mostly the mark of disease of the small vessels.',
    location: 'Most often beside the ventricles (periventricular) and in the deep white matter of the hemispheres.',
    clinical: [
      'They become common with age and with hypertension, and are a sign of cerebral small vessel disease, with lacunes, enlarged perivascular spaces and microbleeds (Wardlaw et al. 2013).',
      'Their extent is linked to a greater risk of stroke, dementia, depression and gait disturbance, and is graded on scales such as Fazekas’s.',
      'The plaques of multiple sclerosis also appear so, with a different distribution: ovoid, perpendicular to the ventricles (“Dawson’s fingers”), and in the corpus callosum and infratentorial white matter.',
    ],
    note: 'FreeSurfer’s “WM-hypointensities” label. In a template, an average of 152 brains, it marks a few voxels, mostly beside the ventricles, where the average is darker than white matter; they belong to the average, not to any person.',
    refs: ['Wardlaw2013', 'Fischl2002', 'Blumenfeld2021'],
  },
};
