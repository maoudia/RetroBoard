---
status: accepted
date: 2026-11-02
decision-makers: Moncef Aoudia
---

# One engine for solo and shared boards

## Context and Problem Statement

Solo boards ran `LoopbackTransport`, a second engine that folded the board model directly, while shared boards run the signed event ledger through `EncryptedRelayTransport`. Every feature built on the ledger (agenda, roles, clusters, presenter, replica) was missing from "Try solo", and the landing and creation pages each built a solo board by hand. How do we give solo boards every feature without keeping two engines? Change: `solo-parity-and-dedup`.

## Decision Drivers

* Every feature must reach every page; no duplicated code paths (owner feedback, 2026-11-02).
* Zero infrastructure cost, no server-side storage, nothing leaves the tab for a solo board (hard constraints).
* Clean architecture: the transport is a port, adapters are interchangeable.

## Considered Options

* Keep the loopback engine and port each new feature to it
* Run solo boards against the real relay with a private room
* Run the ledger engine against an in-tab relay (a WebSocket stand-in), same code path

## Decision Outcome

Chosen option: "Run the ledger engine against an in-tab relay", because it is the only one that removes the second engine and keeps solo data in the tab.

* `EncryptedRelayTransport` already takes its socket class as a dependency; solo boards pass `LocalRelaySocket`, which answers the relay frames (`welcome`, `hist`, `pub`) from an in-memory `EnvelopeBuffer` and drops live frames. Peer-to-peer is off for solo.
* `EnvelopeBuffer` and `chunk` moved from the relay to `packages/protocol` so the relay and the in-tab relay share one implementation.
* A solo board is an ordinary encrypted board (key ring, signed events, local encrypted replica). The rooms that are solo on this device are remembered in `retroboard:solo`; the creation flow has a solo switch ("Try solo" opens it preselected).
* `LoopbackTransport` and the bare `#local-...` links are removed. The domain `reduce` stays: the ledger fold uses it for both kinds of board.

### Consequences

* Good, because solo boards get every present and future feature with no extra code, and reopen from the local replica.
* Good, because a later "share this solo board" only has to forget the solo mark and let the transport reseed the real relay.
* Bad, because old `#local-...` links stop working (they never survived the tab).
* Addendum (change `solo-board-parity`): one engine does not make the web layer identical, so the two modes are kept honest by a guard. `tests/e2e/solo-parity.spec.ts` plays the same scenarios (write, publish, vote and the vote limit, lock, timer, actions, report) on a solo and on a shared board and fails on any difference that is not listed in its `DECLARED` table. The in-tab relay refuses the same frames as the Durable Object because both call `checkFrame` (`packages/protocol/src/budgets.ts`), and a solo board only reaches the real relay after the owner chose "Make this board shareable".

## More Information

* Supersedes nothing; complements ADR-0024 (protocol v2, peer to peer with the relay as a safety net).
