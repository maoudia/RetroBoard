# Proposal

## Why

The service is live and its safety net has holes that a reading of the repository shows.

- `scripts/smoke.mjs:29` checks the relay at `/ws`. The relay is at `/ws2` (`apps/relay/src/index.ts:51`); production answers 404 on `/ws`. The check "relay rejects foreign origins" therefore passes without reaching the relay, and no check opens a board connection. A deploy that breaks the relay is not rolled back (`deploy.yml` step "Roll back after a failed smoke test" depends on this script).
- `wrangler.jsonc:40` sets `observability.issue_detection`. Wrangler 4.158 reports "Unexpected fields found in observability field: issue_detection"; the key is `issues`. Issue detection is off.
- `apps/relay/src/index.ts:13-17` refuses upgrades (403, 400) without a log line, so an origin misconfiguration or an attack is invisible.
- `wrangler.jsonc:10` (`run_worker_first: true`) sends every request, hashed assets included, through the Worker. The landing page alone references 18 files under `/_nuxt/`. The Workers Free plan allows 100,000 requests a day; `docs/capacity.md` budgets the Durable Object only.

Pull request #608 already points the smoke test at `/ws2` (foreign origin 403, `welcome` then `hist`) and renames the observability key; this change covers what is left.

## What Changes

- The smoke test targets `/ws2`, proves a foreign origin gets 403, opens a same-origin connection to a random room and expects `welcome` then an empty `hist`, and sends one `eph` frame between two sockets.
- `observability.issues.enabled` replaces the unknown key; a unit test keeps `wrangler.jsonc` observability keys inside the schema shipped with Wrangler.
- Refused upgrades log `ws.reject` with a reason (`origin`, `room`), no origin value, no room id.
- Hashed assets under `/_nuxt/` are served without invoking the Worker, with their security headers from a generated `_headers` file, if and only if a missing chunk still answers 404 (decided in the ADR of task 3.2).
- `docs/capacity.md` states requests per cold visit and visits per day; an incident runbook says what to look at and how to roll back.

Out of scope: paid plans, a second region, server-side metrics storage, any change to the relay protocol, editing workflows.

Bounded contexts: Platform (relay Worker, delivery). Free-plan budget: the smoke test adds 2 connections and 1 message per run (4 scheduled runs a day plus deploys); group 3 removes about 18 Worker invocations per cold visit.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform-security`: production verification of relay admission, request budget.

## Impact

- Scripts: `scripts/smoke.mjs`. Relay: `apps/relay/src/index.ts` (one log call). Config: `wrangler.jsonc`, `deploy/selfhost/wrangler.jsonc`. Docs: `docs/capacity.md`, `docs/runbooks/deploy.md`, new `docs/runbooks/incident.md`, one ADR.
- No user-facing string, no theme, no format.
