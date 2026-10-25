---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# French and English interface

## Context and Problem Statement

The product targets French teams first, and English for everyone else.

## Considered Options

* FR and EN with typed dictionaries, community-extensible
* Five machine-translated languages

## Decision Outcome

Chosen option: "FR and EN with typed dictionaries, community-extensible", because quality comes first; a pseudo-locale in CI catches overflow.

### Consequences

* Good, because every string is reviewed
* Bad, because fewer languages at launch
