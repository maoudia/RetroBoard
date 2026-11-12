---
status: accepted
date: 2026-11-12
decision-makers: Moncef Aoudia
---

# Cloudflare is one deploy target; the relay core is runtime-neutral

## Context and Problem Statement

ADR-0001 hosts RetroBoard on Cloudflare Workers with static assets and one Durable Object class, and ADR-0018 wants a product that could leave Cloudflare. Two years of code later the relay room is a Durable Object class (`apps/relay/src/relay-room.ts`, the only file that imports `cloudflare:workers`), the self-host image runs that Worker under `wrangler dev --local` (workerd), and nothing proves the product on any other runtime. The owner's direction (2026-11-11) is that RetroBoard must not depend on Cloudflare services and that Cloudflare stays one deploy target. The inventory of the Cloudflare-independence report found the lock-in to be one source file, one binding and one header; a Node prototype ran the relay path of the core e2e suite with the same results as workerd. How do we keep the zero-cost hosted service and make Cloudflare optional at the same time? OpenSpec change: `portable-relay-core`.

## Decision Drivers

* No vendor lock-in and no paid service (ADR-0018)
* Zero infrastructure cost for the hosted service (`openspec/config.yaml`): Workers Free stays the primary target
* No server-side storage, content-free logs, strict CSP: the same hard rules on every runtime
* A self-host image that an operator can run and trust (today's workerd image needs about 1 GB of memory for a relay whose logic fits in 120 lines)
* One implementation of the relay behaviour, tested once

## Considered Options

* A runtime-neutral relay core with thin adapters: Cloudflare Durable Object and Node, the same contract suite on both, the container runs Node
* Keep the Durable Object as the relay and ship the workerd container as the only self-host path (status quo)
* Leave Cloudflare: move the hosted service to a Node server behind a CDN
* Rewrite the relay for a portable platform layer (a framework that abstracts Workers, Node, Deno and Bun)

## Decision Outcome

Chosen option: "A runtime-neutral relay core with thin adapters", because the room logic is already pure TypeScript over `packages/protocol` and only its socket plumbing is Cloudflare's; extracting it costs one module, keeps the Cloudflare deployment byte for byte identical (the `RelayRoom` class, its migrations and its hibernation stay), and gives the self-host image a runtime that starts in under a second and needs tens of megabytes. The hosted service stays on Workers Free (ADR-0001 still holds for it); Cloudflare becomes one deploy target among others instead of the definition of the product.

Rules that follow from this decision:

* Relay behaviour lives in `apps/relay/src/core/`, which imports nothing from `cloudflare:*`, `node:*` or a browser API; an architecture rule enforces it.
* An adapter (`apps/relay/src/adapters/*`) contains only what its runtime needs to open sockets, read and write a per-connection attachment and serve files. A behaviour that is implemented in an adapter is a defect.
* Both adapters pass the same contract suite (smoke script, relay protocol assertions, core e2e). A Cloudflare-only optimisation (ADR-0034 asset-layer bypass, `_headers`) is labelled as such and asserted on the workerd target.
* Cloudflare-specific services remain allowed for the hosted service (edge rules, observability, deploy tooling) as long as the product works without them.
* The self-host image runs the Node adapter; the workerd image is kept one release as a fallback tag.

### Consequences

* Good, because the relay behaviour is implemented once and unit tested with fake sockets, on either runtime
* Good, because self-hosting stops depending on Wrangler and workerd: a smaller image, a fraction of the memory, a plain Node process an operator can reason about
* Good, because the hosted service and its cost model do not change; `wrangler.jsonc` and the Durable Object migrations are untouched
* Good, because future features (license redemption, ICE configuration, TURN credentials) are written in the core once and run everywhere
* Bad, because two adapters and two CI targets are more to maintain than one; the contract suite is the price of that
* Bad, because the Node adapter has no hibernation: an idle room costs memory until its last socket closes, and horizontal placement needs room affinity at the proxy
* Bad, because a self-hosted instance has none of the edge protection of ADR-0019 unless the operator adds a proxy; the Node adapter caps connections and rates itself to soften that

## More Information

Report: Cloudflare-independence inventory and experiments (task `rb-cf-independence`, 2026-11-11). OpenSpec change `portable-relay-core` (this decision, the core, the Node adapter, the container); follow-up change `rtc-config-and-deploy-targets` (runtime ICE configuration, TURN with standard credentials, deploy target matrix). Related: ADR-0001 (still the hosting decision of the hosted service), ADR-0018 (the intent this ADR implements), ADR-0019 (edge protection: an extra layer, no longer the only one), ADR-0020 (no server-side storage, unchanged), ADR-0034 (a Cloudflare adapter optimisation). Revisit when a second hosted deployment target exists or when the Node adapter has run a release cycle in the push gate.
