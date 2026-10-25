---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# No paid service and no vendor lock-in

## Context and Problem Statement

The owner wants a reliable product that never needs a paid Cloudflare service and could leave Cloudflare.

## Decision Drivers

* Zero cost
* Portability

## Considered Options

* Cloudflare serves the site and the strict minimum (signalling); STUN servers configurable; no TURN
* Use Cloudflare paid features (Workers Paid, TURN, Access)
* Self-host everything now

## Decision Outcome

Chosen option: "Cloudflare serves the site and the strict minimum (signalling); STUN servers configurable; no TURN", because the product keeps working on the free plan and nothing ties it to one vendor.

### Consequences

* Good, because any static host plus a small WebSocket server could run RetroBoard
* Bad, because without TURN, the strictest networks rely on the relay fallback

## More Information

Configuration: NUXT_PUBLIC_ICE_SERVERS. Related: ADR-0017.
