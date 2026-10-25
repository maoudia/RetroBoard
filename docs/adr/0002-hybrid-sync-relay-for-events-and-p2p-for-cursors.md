---
status: superseded by ADR-0017
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Hybrid sync: relay for events, peer to peer for cursors

## Context and Problem Statement

Boards are real time. Carrying cursors through the Durable Object would exhaust the free quota, and pure peer to peer fails behind strict NAT without a paid TURN server.

## Decision Drivers

* Real-time feel inside the free quota

## Considered Options

* Durable Object in-memory relay for events and signalling, WebRTC peer to peer for cursors and presence, relay fallback at 4 Hz
* Durable Object only
* Pure peer to peer

## Decision Outcome

Chosen option: "Durable Object in-memory relay for events and signalling, WebRTC peer to peer for cursors and presence, relay fallback at 4 Hz", because it kept the real-time feel inside the free quota.

### Consequences

* Good, because events were simple to order and buffer for late joiners
* Bad, because the relay carried every board event, so the object stayed awake for the whole retro (duration limit of the free plan, see docs/capacity.md)

## More Information

Superseded on 2026-10-24 by ADR-0017: board events also travel peer to peer.
