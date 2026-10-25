---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Event-sourced board replicated in every browser

## Context and Problem Statement

Without server storage, every browser must hold the board and converge on the same state.

## Decision Drivers

* Zero storage on our side
* Domain invariants kept in the DDD domain

## Considered Options

* Event-sourced board replicated in every browser (encrypted, IndexedDB), deterministic replay through the domain
* Yjs or Automerge CRDT
* Server-authoritative state

## Decision Outcome

Chosen option: "Event-sourced board replicated in every browser (encrypted, IndexedDB), deterministic replay through the domain", because it reuses the tested reducer, keeps invariants in the domain and lets any peer resurrect the board.

### Consequences

* Good, because any participant can bring the board back after everyone left
* Bad, because convergence (ordering, rate limits) is our code to maintain

## More Information

Yjs remains the fallback if convergence work grows (docs/PLAN.md section 5.6).
