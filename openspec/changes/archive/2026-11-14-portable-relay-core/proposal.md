# Proposal

## Why

The product direction is that RetroBoard must not depend on Cloudflare services: Cloudflare Workers stays the zero-cost hosted target (ADR-0001, ADR-0018), one deploy target among others. Today the relay is a Durable Object class (`apps/relay/src/relay-room.ts`, the only file that imports `cloudflare:workers`), the self-host container runs the Worker under `wrangler dev --local` (workerd, about 250 MB of tooling and about 1 GB of memory for a relay whose logic fits in 120 lines), and nothing proves the product on any other runtime. The Cloudflare-independence report (task `rb-cf-independence`, 2026-11-11) measured the lock-in at one source file plus one binding and one header, and ran the whole relay path of the core e2e suite on a 124-line Node prototype with the same results as workerd.

## What Changes

- The room logic of the relay (admission of a socket, `welcome`, history replay, `peers` broadcast, `eph` fan-out, `sig` routing, `wrong-room`, the connection cap, size and rate budgets) moves into a runtime-neutral core with no `cloudflare:*`, `node:*` or browser import, over a minimal socket port; an architecture rule enforces it.
- The Durable Object becomes a thin Cloudflare adapter around that core. Its class name `RelayRoom`, the `wrangler.jsonc` bindings and migrations, the hibernation and attachment mechanics and every frame it sends stay byte for byte the same.
- The Worker `fetch` (headers, CSP, errors, maintenance, page limiter, admission) becomes a runtime-neutral HTTP handler over an assets port; the client address comes from a `CLIENT_IP_HEADER` setting instead of a hard-coded `CF-Connecting-IP`.
- A Node adapter (`ws` plus `node:http`, no framework) serves the static site with the Cloudflare asset-layer rules and runs the same core; the container image runs it instead of workerd.
- One adapter contract suite (smoke script, relay protocol assertions, core e2e) runs against any base URL: the push gate on the Node adapter, nightly and release on both adapters.
- Documentation, runbooks and the privacy text stop presenting Cloudflare as the only runtime; the operator block of the privacy page becomes configurable per deployment.

Out of scope: TURN credentials and the runtime ICE endpoint, Turnstile removal from `licensing-and-monetization`, the deploy target matrix of `deploy.yml` (all in the follow-up change `rtc-config-and-deploy-targets`); the container smoke job and the `ca-certificates` fix (change `selfhost-container-gate`, pull request #662); any change to the wire protocol; multi-instance room placement (documented as a proxy recipe only); leaving Cloudflare for the hosted service.

Bounded contexts: Platform (relay, delivery). Access is untouched: admission rules do not change.

Free-plan budget: no new relay traffic. The Cloudflare deployment sends and receives exactly the frames it sends and receives today; the contract suite adds no scheduled run on the hosted service.

## Capabilities

### New Capabilities

- `relay-core`: the behaviour of a relay room that every runtime must reproduce identically: admission, welcome and history, peer announcements, fan-out, signalling, refusals and close codes, with no dependency on a runtime API.
- `self-hosting`: running RetroBoard outside Cloudflare: the published image runs the relay and serves the site on plain Node, with the same externally visible behaviour as the hosted service, proven by the same contract tests.

### Modified Capabilities

- `platform-security`: the privacy page names the operator and the hosting provider of the deployment it runs on, not Cloudflare unconditionally; the client address used by the page limiter comes from a configured header or the socket, never from an untrusted proxy header.

## Impact

- Relay: `apps/relay/src/relay-room.ts` becomes `apps/relay/src/adapters/cloudflare.ts` (class `RelayRoom` kept); new `apps/relay/src/core/` (room core, HTTP handler, logger) and `apps/relay/src/adapters/node.ts`; `apps/relay/src/index.ts` keeps its default export for `wrangler.jsonc`. `.dependency-cruiser.cjs` gains a rule for the core. One dependency, `ws` (MIT), for the Node adapter.
- Tests: `apps/relay/test/room-core.test.ts` (fakes), existing `apps/relay/test/*` unchanged in intent; `scripts/smoke.mjs` and `tests/e2e/core.json` reused against both adapters; CI jobs for the two targets.
- Container: `Dockerfile` runtime stage without wrangler and workerd; `deploy/selfhost/` configuration for the Node adapter.
- Docs: new ADR-0036 (`docs/adr`), `docs/architecture.md` (sections 3, 5.3, 11), `docs/self-hosting.md`, `docs/capacity.md`, runbooks, README; i18n keys (fr, en) for the configurable operator block.
- No user-facing flow changes; no theme, no template, no wire protocol change.
