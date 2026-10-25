---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Board events and cursors travel peer to peer

## Context and Problem Statement

With ADR-0002 the relay carried every board event and kept the Durable Object awake for the whole retro, so the free plan allowed about 25 one-hour retros per day (docs/capacity.md). The owner decided the product must never depend on server services.

## Decision Drivers

* No paid service and no vendor lock-in (ADR-0018)
* Works behind strict networks
* Same end-to-end encryption

## Considered Options

* WebRTC mesh for board events, cursors and focus, relay for signalling and presence, capped relay fallback through a bridge peer
* Relay carries everything (ADR-0002)
* Pure peer to peer without fallback
* Peer to peer with a TURN server

## Decision Outcome

Chosen option: "WebRTC mesh for board events, cursors and focus, relay for signalling and presence, capped relay fallback through a bridge peer", because the relay sleeps between joins (a few dozen billed requests per retro) while participants who cannot link directly still collaborate.

### Consequences

* Good, because the free plan stops being the limit
* Good, because the signalling protocol is small and can run on any WebSocket server
* Bad, because participants see each other's IP address (as in a video call) unless they turn direct links off
* Bad, because link success behind corporate networks must be measured in production (p2p change task 4.2)

## More Information

OpenSpec change p2p-presence-and-cursors (design and tasks 1.x and 4.x). Full mesh up to 12 participants, ring plus opposite peer above.
