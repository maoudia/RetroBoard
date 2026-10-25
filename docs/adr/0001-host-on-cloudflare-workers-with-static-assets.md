---
status: accepted
date: 2026-10-24
decision-makers: Moncef Aoudia
---

# Host on Cloudflare Workers with static assets

## Context and Problem Statement

RetroBoard needs a static site and a small real-time relay, at zero cost, on the domain retroboard.maoudia.com.

## Decision Drivers

* Zero infrastructure cost (free plan)
* One deployable

## Considered Options

* Cloudflare Workers with static assets (site and relay in one Worker)
* Cloudflare Pages plus a separate Worker

## Decision Outcome

Chosen option: "Cloudflare Workers with static assets", because Pages cannot host the Durable Object, and one deployable is simpler than two.

### Consequences

* Good, because one deploy, one domain, one CSP
* Bad, because the relay and the site share the Worker request budget of the free plan

## More Information

Workers limits: <https://developers.cloudflare.com/workers/platform/limits/>. Scope reduced later by ADR-0018 (Cloudflare serves the site and the strict minimum).
