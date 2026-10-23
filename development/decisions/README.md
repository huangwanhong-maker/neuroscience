# Decision Log

Decisions that concern only this domain. Decisions that shape The Science Infrastructures as a whole are in [its log](https://github.com/huangwanhong-maker/The-Science-Infrastructures/tree/main/development/decisions); the domain itself was founded by its [ADR 0028](https://github.com/huangwanhong-maker/The-Science-Infrastructures/blob/main/development/decisions/0028-neuroscience-and-the-brain-atlas.md).

- Records are numbered and are never rewritten.
- To change a decision, write a new record that supersedes or amends the old one, and update the old record's status to point to the new one.

## 1. Index

| No. | Decision | Status |
|---|---|---|
| [0001](0001-the-model-of-a-brain-atlas.md) | The model of a brain atlas: spaces, parcellations, maps and the head, read from bytes | Accepted |
| [0002](0002-spiking-networks-in-cpp.md) | Networks of spiking neurons, in C++ on the foundations | Accepted |

## 2. Template

```markdown
# NNNN. Title

- **Status:** Proposed | Accepted | Amended by NNNN | Superseded by NNNN
- **Date:** YYYY-MM-DD
- **Decided by:** …

## 1. Context
## 2. Decision
## 3. Alternatives Considered
## 4. Consequences
```
