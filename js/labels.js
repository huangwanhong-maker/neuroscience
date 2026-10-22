// Readers of the files that name regions and their labels, each turned into a
// parcellation (parcellation.js):
//
//   FreeSurferColorLUT.txt     FreeSurfer's lookup table: "index name R G B A"
//   *_dseg.tsv                 BIDS and TemplateFlow: "index  name  color"
//   Schaefer 2018              the dseg.tsv of Schaefer et al. (2018), whose names
//                              "7Networks_LH_Vis_1" carry the network and the side
//   structure_graph JSON       the Allen Institute's ontology (structure_graph_download)
//   siibra parcellation JSON   the EBRAINS atlas configuration, with its map's indices
//   ITK-SNAP label description "IDX -R- -G- -B- -A-- VIS MSH LABEL"
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import { Parcellation, hemisphereOf, stripHemisphere } from './parcellation.js';

const hexColour = (h) => {
  const s = String(h).replace('#', '');
  return s.length === 6 ? [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)] : null;
};

// FreeSurfer's lookup table (FreeSurferColorLUT.txt): a flat parcellation of
// every label listed, with the side read from the name ("Left-", "ctx-lh-").
export function fromFreeSurferLUT(text, { name = 'FreeSurfer colour lookup table', ...rest } = {}) {
  const regions = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)\s+(\S+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/);
    if (!m) continue;
    const label = Number(m[1]);
    if (label === 0) continue;
    regions.push({ name: m[2], label, hemisphere: hemisphereOf(m[2]), colour: [Number(m[3]), Number(m[4]), Number(m[5])] });
  }
  return new Parcellation({ name, regions, ...rest });
}

// A BIDS segmentation lookup table (dseg.tsv): the columns index, name and
// optionally color (#rrggbb); other columns are kept as attributes.
export function fromBidsDseg(tsv, { name = 'Segmentation', ...rest } = {}) {
  const lines = tsv.split(/\r?\n/).filter((l) => l.trim());
  const columns = lines.shift().split('\t').map((c) => c.trim().toLowerCase());
  const regions = [];
  for (const line of lines) {
    const cells = line.split('\t');
    const row = Object.fromEntries(columns.map((c, i) => [c, (cells[i] || '').trim()]));
    const label = Number(row.index);
    if (!Number.isFinite(label) || !row.name) continue;
    const { index, name: n, color, colour, ...attributes } = row;
    regions.push({ name: n, label, hemisphere: hemisphereOf(n), colour: hexColour(color || colour || '') , ...attributes });
  }
  return new Parcellation({ name, regions, ...rest });
}

// The seven networks of Yeo et al. (2011), as Schaefer's names abbreviate them,
// and the seventeen of the finer division.
export const YEO_NETWORKS = {
  Vis: 'Visual', SomMot: 'Somatomotor', DorsAttn: 'Dorsal attention', SalVentAttn: 'Salience / ventral attention',
  Limbic: 'Limbic', Cont: 'Control (frontoparietal)', Default: 'Default mode',
  VisCent: 'Visual central', VisPeri: 'Visual peripheral', SomMotA: 'Somatomotor A', SomMotB: 'Somatomotor B',
  DorsAttnA: 'Dorsal attention A', DorsAttnB: 'Dorsal attention B', SalVentAttnA: 'Salience / ventral attention A',
  SalVentAttnB: 'Salience / ventral attention B', LimbicA: 'Limbic A', LimbicB: 'Limbic B', ContA: 'Control A', ContB: 'Control B',
  ContC: 'Control C', DefaultA: 'Default A', DefaultB: 'Default B', DefaultC: 'Default C', TempPar: 'Temporal parietal',
};

// The Schaefer parcellation from its dseg.tsv, as a tree: networks, then
// hemispheres, then parcels. A name "7Networks_LH_Vis_1" is read as the
// network Vis, the left hemisphere, parcel 1; "17Networks_LH_VisCent_ExStr_1"
// keeps "ExStr" as the parcel's area.
export function fromSchaefer(tsv, { name = null, ...rest } = {}) {
  const flat = fromBidsDseg(tsv, { name: 'Schaefer' });
  const networks = new Map();
  let networksCount = 7;
  for (const r of flat.all) {
    const parts = r.name.split('_');
    if (parts.length < 4) continue;
    const [tag, side, network, ...others] = parts;
    networksCount = Number(tag.replace('Networks', '')) || networksCount;
    const hemisphere = side === 'LH' ? 'left' : side === 'RH' ? 'right' : null;
    if (!networks.has(network)) networks.set(network, { name: YEO_NETWORKS[network] || network, acronym: network, colour: r.colour, children: [{ name: 'Left hemisphere', hemisphere: 'left', children: [] }, { name: 'Right hemisphere', hemisphere: 'right', children: [] }] });
    const net = networks.get(network);
    const parcel = { name: r.name, label: r.label, hemisphere, colour: r.colour, area: others.length > 1 ? others.slice(0, -1).join('_') : null, number: Number(others[others.length - 1]) };
    net.children[hemisphere === 'right' ? 1 : 0].children.push(parcel);
  }
  const count = flat.size;
  return new Parcellation({
    id: `schaefer-2018-${count}-${networksCount}`,
    name: name || `Schaefer 2018, ${count} parcels in ${networksCount} networks`,
    version: '2018', species: 'Homo sapiens', modality: 'functional connectivity',
    citations: ['Schaefer2018', 'Yeo2011'], licence: 'MIT (CBIG)',
    regions: [...networks.values()], ...rest,
  });
}

// The Allen Institute's structure ontology, from the JSON of
// http://api.brain-map.org/api/v2/structure_graph_download/1.json (the mouse
// brain), or any node or list of nodes of it. A structure's id is its label in
// the annotation volumes, and its colour is the atlas's.
export function fromAllenStructureGraph(json, { name = 'Allen Mouse Brain Atlas ontology', ...rest } = {}) {
  const roots = Array.isArray(json) ? json : json.msg ? json.msg : [json];
  const convert = (n) => ({
    name: n.name, acronym: n.acronym, id: n.id, label: n.id,
    colour: n.color_hex_triplet ? hexColour(n.color_hex_triplet) : null,
    graphOrder: n.graph_order, level: n.st_level, atlasId: n.atlas_id,
    children: (n.children || []).map(convert),
  });
  return new Parcellation({ name, regions: roots.map(convert), species: 'Mus musculus', ...rest });
}

// A parcellation of the EBRAINS atlas configuration (siibra-configurations:
// parcellations/*.json), whose regions are a tree of names; with the JSON of one
// of its labelled maps (maps/*.json), the regions get the labels of that map's
// volumes. A map's volume may come in fragments, one file each, named in its
// providers; a label then belongs to the fragment named with it.
export function fromSiibraParcellation(json, { map = null, ...rest } = {}) {
  const convert = (n) => ({
    name: n.name, hemisphere: hemisphereOf(n.name),
    granularity: n.granularity || null, ebrains: n.ebrains || null,
    children: (n.children || []).map(convert),
  });
  const spec = {
    id: json['@id'] || null, name: json.name, version: json['@version'] ? json['@version'].name : null,
    species: json.species || null, modality: json.modality || null, description: json.description || '',
    citations: (json.publications || []).map((p) => p.citation || p.name).filter(Boolean),
    regions: (json.regions || []).map(convert), ...rest,
  };
  if (map) {
    const fragments = [];
    for (const v of map.volumes || []) {
      const nii = v.providers && v.providers.nii;
      if (nii && typeof nii === 'object') for (const f of Object.keys(nii)) fragments.push({ volume: map.volumes.indexOf(v), fragment: f, url: nii[f] });
      else fragments.push({ volume: map.volumes.indexOf(v), fragment: null, url: typeof nii === 'string' ? nii : null });
    }
    const fragmentIndex = (volume, fragment) => {
      const i = fragments.findIndex((f) => f.volume === volume && (f.fragment === (fragment || null)));
      return i >= 0 ? i : 0;
    };
    const labelsOf = new Map();
    for (const [regionName, entries] of Object.entries(map.indices || {})) {
      labelsOf.set(regionName, entries.map((e) => ({ label: e.label, fragment: fragmentIndex(e.volume || 0, e.fragment) })));
    }
    const attach = (node) => {
      if (labelsOf.has(node.name)) node.labels = labelsOf.get(node.name);
      node.children.forEach(attach);
    };
    spec.regions.forEach(attach);
    spec.fragments = fragments;
    spec.map = { id: map['@id'] || null, name: map.name || null, space: map.space ? map.space['@id'] : null };
  }
  return new Parcellation(spec);
}

// ITK-SNAP's label description file: "IDX -R- -G- -B- -A-- VIS MSH LABEL".
export function fromItkSnapLabels(text, { name = 'ITK-SNAP labels', ...rest } = {}) {
  const regions = [];
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(\d+)\s+(\d+)\s+"(.*)"/);
    if (!m) continue;
    const label = Number(m[1]);
    if (label === 0) continue;
    regions.push({ name: m[8], label, hemisphere: hemisphereOf(m[8]), colour: [Number(m[2]), Number(m[3]), Number(m[4])] });
  }
  return new Parcellation({ name, regions, ...rest });
}

void stripHemisphere;
