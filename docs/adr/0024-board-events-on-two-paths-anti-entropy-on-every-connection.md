---
status: accepted
date: 2026-10-25
decision-makers: Moncef Aoudia
---

# Board events on two paths, anti-entropy on every connection

## Context and Problem Statement

ADR-0017 moved board events to a WebRTC mesh and kept the relay for signalling, presence and a "bridge" fallback for participants with no direct link. The owner's field test on 2026-10-25 (real devices, different networks) showed that participants could not publish, saw different boards, and that the facilitator lost notes. The sync harness of OpenSpec change `reliable-board-sync` reproduces seven causes: a partial mesh with no forwarding, a bridge that pushes only once, commands dropped during a reconnect, a replica write batch lost on reload, a second board started from a facilitator link on a new device, a clock-skew ordering bug and swallowed storage errors. The owner requires 0 EUR and a distributed, reliable design.

## Decision Drivers

* No paid service and no vendor lock-in (ADR-0018); no server-side storage (ADR-0020)
* A board must never silently lose or fork, whatever the network
* Keep the free-plan budget of ADR-0017 in the normal case

## Considered Options

* Two paths with anti-entropy: mesh always, relay when my links are incomplete, anti-entropy on every connection, local-first sending
* Fix the mesh only (gossip forwarding, per-peer relay fallback)
* Relay carries every event again (ADR-0002)
* Mesh plus a TURN server

## Decision Outcome

Chosen option: "Two paths with anti-entropy: mesh always, relay when my links are incomplete, anti-entropy on every connection, local-first sending", because it removes every failure mode found without a server authority, a paid service or storage on our side.

* **Delivery.** An event goes to every open direct link. It also goes to the relay when the sender's links are incomplete (no mesh, or fewer open links than other participants). A missing pair is missing for both ends, so both use the relay; everyone else already has the event over the mesh. When every pair is linked, no board event crosses the relay.
* **Anti-entropy.** After the relay history, each client pushes the events it holds that the history lacked; when someone joins, one deterministic holder (lowest connection id among ready peers) re-pushes the board. The relay forwards only ids it does not hold, so this also rebuilds a relay that lost its memory, with or without direct links.
* **Local first.** Once a board is known, commands are accepted offline, written to the local replica, and delivered at the next connection. The replica is written before an event counts as published and flushed on close.
* **Single creator.** Only the tab that created the board may create its genesis; any other tab waits for a holder.
* **Causal stamps.** A local event always sorts after every event the log holds.
* The relay-only mode and the bridge are removed. Cursors and focus stay peer to peer (ADR-0002).

### Consequences

* Good, because all seven field failures become tests that must pass, and nothing depends on one peer being the bridge
* Good, because the relay stays a dumb pipe of ciphertext that can run on any WebSocket server
* Good, because with a complete mesh the relay still sees no board events
* Bad, because with an incomplete mesh the relay is awake for the activity: at 128 MB the free plan's 13,000 GB-s per day bound is about 28 fully active one-hour retros per day (an upper bound for activity; real retros are bursty). Measure in production.
* Bad, because the relay can again observe event counts, sizes and timing for the participants who use it (content, authors and votes stay end-to-end encrypted)
* Bad, because a clock far ahead can drag later local timestamps (accepted: losing data is worse than a shifted timer)

## More Information

Supersedes ADR-0017 (delivery part). Related: ADR-0002, ADR-0018, ADR-0020. OpenSpec change `reliable-board-sync` (design D1 to D9). Capacity figures: `docs/capacity.md`. Revisit when production measurements of link success and relay duration exist.
