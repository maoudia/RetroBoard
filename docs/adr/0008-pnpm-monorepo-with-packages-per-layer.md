---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# pnpm monorepo with packages per layer

## Context and Problem Statement

Clean architecture layers must be enforced, not only described.

## Considered Options

* pnpm workspaces with one package per layer, Turborepo only if CI gets slow
* Single Nuxt app with folders

## Decision Outcome

Chosen option: "pnpm workspaces with one package per layer, Turborepo only if CI gets slow", because layer boundaries become package boundaries that tools (dependency-cruiser) enforce.

### Consequences

* Good, because the pure domain cannot import a framework by mistake
* Bad, because more package configuration
