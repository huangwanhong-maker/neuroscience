// Parcellations: the division of the brain into named regions, arranged in a
// hierarchy.
//
// A parcellation is a rooted forest of regions. Each region may hold children,
// finer regions that together make it up: the cerebral cortex holds its lobes,
// a lobe its gyri, a cytoarchitectonic area its two hemispheric parts. Formally
// the regions are a partial order under containment; the descendants of a
// region, with the region itself, are its down-set, and its leaves are the
// finest regions it contains. A labelled map (maps.js) gives each voxel the
// label of one leaf, so a region's voxels are the union of the voxels of its
// leaves: membership is decided by label sets, which this module keeps.
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

// A label is specific to a volume: a labelled map may be made of several
// volumes (Julich-Brain gives one per hemisphere), so a label is keyed with
// the index of the fragment it lives in.
export const LABEL_BASE = 1 << 20;
export const labelKey = (label, fragment = 0) => fragment * LABEL_BASE + label;
export const keyLabel = (key) => ({ fragment: Math.floor(key / LABEL_BASE), label: key % LABEL_BASE });

export class Region {
  constructor(spec, parent = null) {
    const { name, acronym = null, label = null, labels = null, hemisphere = null, colour = null, id = null, children = [], ...attributes } = spec;
    if (!name) throw new Error('a region needs a name');
    this.name = name;
    this.acronym = acronym;
    this.id = id;
    this.hemisphere = hemisphere === undefined ? null : hemisphere;
    this.colour = colour;
    this.attributes = attributes;
    this.parent = parent;
    this.depth = parent ? parent.depth + 1 : 0;
    // Labels: a single label in fragment 0, or several {label, fragment}.
    this.labels = labels ? labels.map((l) => (typeof l === 'number' ? { label: l, fragment: 0 } : { label: l.label, fragment: l.fragment || 0 })) : label === null || label === undefined ? [] : [{ label, fragment: 0 }];
    this.children = children.map((c) => (c instanceof Region ? c : new Region(c, this)));
    this.index = -1;
    this._keys = null;
  }

  get label() { return this.labels.length ? this.labels[0].label : null; }
  get isLeaf() { return this.children.length === 0; }
  get keys() { return this.labels.map((l) => labelKey(l.label, l.fragment)); }

  // The labels of this region and all beneath it: the set that decides whether
  // a voxel belongs to the region.
  labelKeys() {
    if (!this._keys) {
      this._keys = new Set(this.keys);
      for (const c of this.children) for (const k of c.labelKeys()) this._keys.add(k);
    }
    return this._keys;
  }

  ancestors() { const out = []; for (let r = this.parent; r; r = r.parent) out.push(r); return out; }
  root() { let r = this; while (r.parent) r = r.parent; return r; }
  path() { return [...this.ancestors().reverse(), this]; }
  descendants() { const out = []; const walk = (r) => { for (const c of r.children) { out.push(c); walk(c); } }; walk(this); return out; }
  leaves() { return this.isLeaf ? [this] : this.descendants().filter((r) => r.isLeaf); }
  isAncestorOf(r) { return r !== this && r.ancestors().includes(this); }
  isDescendantOf(r) { return r.isAncestorOf(this); }
  // The side of the brain, from this region or the nearest ancestor that states one.
  side() { for (let r = this; r; r = r.parent) if (r.hemisphere) return r.hemisphere; return null; }
  toJSON() {
    const o = { name: this.name };
    if (this.acronym) o.acronym = this.acronym;
    if (this.id !== null) o.id = this.id;
    if (this.labels.length === 1 && this.labels[0].fragment === 0) o.label = this.labels[0].label;
    else if (this.labels.length) o.labels = this.labels;
    if (this.hemisphere) o.hemisphere = this.hemisphere;
    if (this.colour) o.colour = this.colour;
    Object.assign(o, this.attributes);
    if (this.children.length) o.children = this.children.map((c) => c.toJSON());
    return o;
  }
}

const normalise = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export class Parcellation {
  constructor({ id = null, name, version = null, species = null, modality = null, description = '', citations = [], licence = null, regions = [], fragments = null, ...rest }) {
    if (!name) throw new Error('a parcellation needs a name');
    Object.assign(this, { id, name, version, species, modality, description, citations, licence, fragments, ...rest });
    this.roots = regions.map((r) => (r instanceof Region ? r : new Region(r)));
    this.all = [];
    const walk = (r) => { r.index = this.all.length; this.all.push(r); r.children.forEach(walk); };
    this.roots.forEach(walk);
    this.byKey = new Map();
    this.byName = new Map();
    this.byId = new Map();
    for (const r of this.all) {
      for (const k of r.keys) if (!this.byKey.has(k)) this.byKey.set(k, r);
      // A region is found by its name, its acronym, and any other names it
      // carries (a FreeSurfer key, or aliases).
      const names = [r.name, r.acronym, r.attributes.freesurfer, ...(r.attributes.aliases || [])].filter(Boolean);
      for (const alias of names) {
        const n = normalise(alias);
        if (n && !this.byName.has(n)) this.byName.set(n, r);
      }
      if (r.id !== null && !this.byId.has(r.id)) this.byId.set(r.id, r);
    }
  }

  get size() { return this.all.length; }
  leaves() { return this.all.filter((r) => r.isLeaf); }

  // The region with a label (in fragment 0, or the fragment given).
  byLabel(label, fragment = 0) { return this.byKey.get(labelKey(label, fragment)) || null; }

  // A region by its exact name or acronym (ignoring case and punctuation), by its id, or by its label.
  get(key) {
    if (key instanceof Region) return key;
    if (typeof key === 'number') return this.byLabel(key) || this.byId.get(key) || null;
    return this.byName.get(normalise(key)) || this.byId.get(key) || null;
  }

  // Regions whose name or acronym contains the text (or matches the RegExp),
  // exact matches first, then those that begin with it, then the rest.
  find(query, { limit = Infinity } = {}) {
    if (query instanceof RegExp) return this.all.filter((r) => query.test(r.name) || (r.acronym && query.test(r.acronym))).slice(0, limit);
    const q = normalise(query);
    if (!q) return [];
    const scored = [];
    for (const r of this.all) {
      const names = [normalise(r.name), r.acronym ? normalise(r.acronym) : ''];
      let score = 0;
      for (const n of names) {
        if (!n) continue;
        if (n === q) score = Math.max(score, 3);
        else if (n.startsWith(q)) score = Math.max(score, 2);
        else if (n.includes(q)) score = Math.max(score, 1);
      }
      if (score) scored.push([score, r]);
    }
    scored.sort((a, b) => b[0] - a[0] || a[1].index - b[1].index);
    return scored.slice(0, limit).map((x) => x[1]);
  }

  // A region named loosely, as in a table someone pastes: by exact name, id or
  // label; else by a name with the hemisphere written another way; else the one
  // region whose name contains the text. Null when nothing or several match.
  match(text) {
    const direct = this.get(text);
    if (direct) return direct;
    if (typeof text !== 'string') return null;
    const side = hemisphereOf(text), base = stripHemisphere(text);
    if (side) {
      const candidates = this.all.filter((r) => normalise(stripHemisphere(r.name)) === normalise(base) && r.side() === side);
      if (candidates.length === 1) return candidates[0];
    }
    const found = this.find(text);
    return found.length === 1 ? found[0] : null;
  }

  toJSON() {
    const { roots, all, byKey, byName, byId, ...rest } = this;
    return { ...rest, regions: roots.map((r) => r.toJSON()) };
  }
}

export const parcellation = (spec) => new Parcellation(spec);

// The deepest region containing both.
export function lowestCommonAncestor(a, b) {
  const up = new Set([a, ...a.ancestors()]);
  for (let r = b; r; r = r.parent) if (up.has(r)) return r;
  return null;
}

// The hemisphere a region's name states, by the conventions of the atlases:
// "... - left hemisphere" (EBRAINS), "Left-..." and "ctx-lh-..." (FreeSurfer),
// "7Networks_LH_..." (Schaefer), "lh." and "L " prefixes, "_L" and " (L)" suffixes.
const HEMISPHERE_PATTERNS = [
  [/\s+-\s+(left|right)\s+hemisphere\s*$/i, 1],
  [/^(left|right)[-_\s]+/i, 1],
  [/^ctx[-_](lh|rh)[-_]/i, 1],
  [/^wm[-_](lh|rh)[-_]/i, 1],
  [/(?:^|_)(lh|rh)(?:_|$)/i, 1],
  [/^(lh|rh)\./i, 1],
  [/^(l|r)\s+(?=[a-z])/i, 1],
  [/[\s_-](l|r)$/i, 1],
  [/\((l|r|left|right)\)\s*$/i, 1],
  [/[\s_-](left|right)$/i, 1],
];
const SIDE = { l: 'left', r: 'right', lh: 'left', rh: 'right', left: 'left', right: 'right' };

export function hemisphereOf(name) {
  for (const [re, group] of HEMISPHERE_PATTERNS) {
    const m = String(name).match(re);
    if (m) return SIDE[m[group].toLowerCase()] || null;
  }
  return null;
}

// The name without its hemisphere, for matching the two sides of one area.
export function stripHemisphere(name) {
  let s = String(name);
  for (const [re] of HEMISPHERE_PATTERNS) {
    if (re.test(s)) {
      s = s.replace(re, (m, g) => (re.source.startsWith('(?:^|_)') ? (m.startsWith('_') && m.endsWith('_') ? '_' : '') : ''));
      break;
    }
  }
  return s.replace(/^[\s_-]+|[\s_-]+$/g, '').trim();
}
