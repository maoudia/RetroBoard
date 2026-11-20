---
status: proposed
date: 2026-11-20
decision-makers: Moncef Aoudia
---

# A poker room is a second room kind on the same transport

## Context and Problem Statement

The owner wants a Scrum Poker feature in the spirit of scrumpoker-online.org: rooms by link, hidden cards, a simultaneous reveal, results, a story list. RetroBoard's rooms, encryption, relay and replica were built for retro boards. The question is where poker lives. See the change `scrum-poker`.

## Decision Drivers

* Zero infrastructure cost and no server-side storage; end-to-end encryption with the key in the link fragment
* No duplicate platform to run and secure
* The relay must stay memory-only and unable to tell what a room is used for
* Votes must stay hidden until the reveal, even from a modified client

## Considered Options

* A poker room modelled as a retro board with a special format
* a new domain and room kind on the same transport (envelopes, encryption and replica reused)
* A separate poker application and relay

## Decision Outcome

Chosen option: "a new domain and room kind on the same transport", because the board model (columns, notes, clusters, actions) is wrong for estimation, while the transport, encryption, join code, passcode, mesh, relay fallback, replica and vault library are exactly what a poker room needs.

Rules:

* The estimation domain is its own pure bounded context (`packages/domain/src/estimation/`); it imports nothing from the board contexts.
* The relay is kind-agnostic: it forwards opaque envelopes and learns nothing about the kind. Any kind marker travels inside the encrypted payload or the key fragment, never as relay-visible metadata.
* Votes are sealed ballots released by the moderator's reveal (the mechanism of the board's sealed voting); the spike of `scrum-poker` task 1.1 confirms it carries a per-round key.
* The voter cap per room is derived from the relay budgets (`packages/protocol/src/budgets.ts`) and recorded here when the spike ends.

### Consequences

* Good, because poker is free, private and account-free by construction and costs no new infrastructure
* Good, because rooms sync and export through the paths boards already use
* Bad, because shared transport code must now serve two kinds, which needs contract tests on both
* Bad, because the largest item of the backlog depends on a spike; if it fails, this ADR is superseded before any code

## More Information

Related: ADR-0017 (events travel peer to peer), ADR-0021 (everyone facilitates by default; poker defaults to one moderator), ADR-0026 (one engine for solo and shared boards), ADR-0029 (compact links with board keys). Revisit if the voter cap makes rooms too small for real teams.
