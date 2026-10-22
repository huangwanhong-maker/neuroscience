// What is known of each structure of the brain (brain.js): its Latin name in
// Terminologia Neuroanatomica (FIPAT 2017), a summary, where it lies, what it does,
// what it connects, its blood supply, its development and its clinical
// significance, with the sources of each statement.
//
// The entries are written from the standard references (Kandel et al. 2021;
// Standring 2020; Haines and Mihailoff 2018; Purves et al. 2018; Vanderah and
// Gould 2021; Duvernoy 1999; Tatu et al. 1996, 1998; Catani and Thiebaut de
// Schotten 2008) and from the papers of the atlases themselves. They state what
// those agree on; where a matter is debated, the entry says so.
//
// An entry may name another to inherit from (`inherit`), as the divisions of a gyrus
// inherit what is said of the gyrus as a whole; the card shows whence it came.
//
// Provisional JavaScript, standing in for the C++ planned for this domain.

import * as frontalParietal from './knowledge/frontal-parietal.js';
import * as temporalOccipitalLimbic from './knowledge/temporal-occipital-limbic.js';
import * as deep from './knowledge/deep.js';
import * as hindbrain from './knowledge/hindbrain.js';
import * as white from './knowledge/white.js';
import { REFERENCES as SHARED } from './knowledge/references.js';

// The parts of the knowledge base, by region of the brain. Each holds its entries
// (KNOWLEDGE) and the references only it cites (REFS); the shared references are
// in knowledge/references.js.
export const KNOWLEDGE_PARTS = { frontalParietal, temporalOccipitalLimbic, deep, hindbrain, white };
export const KNOWLEDGE = Object.assign({}, ...Object.values(KNOWLEDGE_PARTS).map((p) => p.KNOWLEDGE));
export const REFERENCES = Object.assign({}, SHARED, ...Object.values(KNOWLEDGE_PARTS).map((p) => p.REFS));

export const FIELDS = ['summary', 'location', 'function', 'connections', 'supply', 'development', 'clinical'];

// The entry of a structure, and the fields it inherits: {entry, inherited: {field: {id, value}}}.
export function knowledgeOf(id) {
  const entry = KNOWLEDGE[id] || null;
  const inherited = {};
  if (entry && entry.inherit) {
    const from = KNOWLEDGE[entry.inherit];
    if (from) for (const f of FIELDS) if (f !== 'summary' && !entry[f] && from[f]) inherited[f] = { id: entry.inherit, value: from[f] };
  }
  return { entry, inherited };
}

// The full references of an entry's keys.
export const referencesOf = (entry) => (entry && entry.refs ? entry.refs.map((k) => REFERENCES[k] || k) : []);
