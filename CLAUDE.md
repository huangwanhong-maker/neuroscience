# CLAUDE.md

This file guides Claude Code in the neuroscience repository.

neuroscience is a domain of [The Science Infrastructures](https://github.com/huangwanhong-maker/The-Science-Infrastructures), which includes it as the git submodule `domains/neuroscience`. It is a library in its own right and must make sense without the infrastructure; inside it, the infrastructure's `CLAUDE.md` and [ADR 0026](https://github.com/huangwanhong-maker/The-Science-Infrastructures/blob/main/development/decisions/0026-domains-as-libraries.md) govern how a domain is built and checked.

## 1. Purpose and Scope

The domain holds the objects of neuroscience and their models, beginning with a brain atlas: reference spaces and their templates, parcellations and their maps, the head and its electrodes, for the human, the mouse and the rat; then the signals of the brain: recordings, the forward models of EEG and MEG, inverse estimates, and fMRI maps on the cortex. Later modules: cortical surfaces, connectivity, neurons, and networks of spiking neurons.

Out of scope:

- **Fetching data.** Atlases are fetched by the infrastructure's data library into its cache; the domain's readers take bytes.
- **Drawing.** Views belong to the applications and to the shared visualization layer.
- **General mathematics and numerics.** Rotations, interpolation and linear algebra belong to the foundations; what is written here provisionally is noted as such.

## 2. Invariants

1. **Pure.** No network, no file system, no user interface, no hidden global state. A gzipped file is inflated by a function the caller passes.
2. **Explicit spaces.** World coordinates are RAS in millimetres. Every volume carries its affine; every point names its space; every conversion between spaces is a named function with its source.
3. **Explicit versions.** A parcellation carries its version, and a labelled map the identity of its volumes; labels are keyed by fragment.
4. **Cited sources.** Every number that is not computed (a grid, a coefficient, a label, a colour) cites where it comes from, and the tests compare it with the source.
5. **Checked.** Every module has checks in `tests/run-tests.mjs`, with reference values in `tests/fixtures/`, each with its source and retrieval date.

## 3. Repository Layout

```
neuroscience/
├── js/             provisional JavaScript, behind js/index.js
├── tests/          run-tests.mjs and fixtures/
├── theory/         notes
└── development/    decisions · ideas
```

The contract of a domain (README, `module.json`, `js/`, `tests/`, `theory/`, later the C++) is the infrastructure's.

## 4. Working Procedures

- **Checks.** `node tests/run-tests.mjs` inside the infrastructure (it imports the shared harness, `development/tools/checks.mjs`), or `node development/tools/run-tests.mjs` from the infrastructure's root, which also runs the domain alone with its down-set.
- **Commits.** Commit here first, then the updated submodule pointer in the infrastructure.
- **Decisions and ideas.** Records in `development/decisions/`, never rewritten; ideas as `development/ideas/YYYY-MM-DD-slug.md` with a status.
- **Shared conventions.** The writing style (declarative, numbered headings; concepts before structure; asides as *Rationale.*, *Remark.* or *Caveat.*), the status vocabulary (`planned`, `seed`, `draft`, `stable`, `deprecated`) and the decision and idea conventions are those of the infrastructure and its foundations. Change them everywhere together.
- **Change discipline.** Before changing an invariant (§2) or the layout, propose the change and wait for the user's agreement. Keep each change to one concept.

## 5. Technology

- **Language.** C++ in time (ADR 0003 of the infrastructure); until then ES modules in `js/`, which run in Node and in the browser unchanged. The C++ must pass the same checks.
- **Licence.** MIT. The atlases keep their own licences, stated in the infrastructure's data registry and in `js/atlas.js`.

## 6. Current State

As of 2026-10-23: seventeen modules of provisional JavaScript with 162 checks (the anatomy of ADR 0032; the signals, forward and inverse models of ADR 0034, checked on a real EEG recording when it is fetched), four notes, and the catalogue of the fetched atlases. There is no C++ yet.
