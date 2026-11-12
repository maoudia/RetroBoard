# Tasks

## 1. Smoke test that reaches the relay

- [x] 1.1 `scripts/smoke.mjs`: export `runSmoke(base, deps)` with injectable `fetch`, `http` and `WebSocket` (the `/ws2` foreign-origin and handshake checks already exist, pull request #608); verify a unit test in `scripts/ci/test/` where a fake answering 404 on `/ws2` makes the run fail
- [x] 1.2 Same script: a second socket in the random room receives one `eph` frame sent by the first, built with a valid envelope shape; verify against `pnpm dev:worker` and production
- [x] 1.3 `docs/runbooks/deploy.md`: list what the smoke test proves; verify `pnpm verify`

## 2. Observability that is on

- [x] 2.1 Unit test in `apps/relay/test/` that every key under `observability` in `wrangler.jsonc` and `deploy/selfhost/wrangler.jsonc` exists in `node_modules/wrangler/config-schema.json` (the key `issues` replaced `issue_detection` in #608); verify the test fails on the old key
- [x] 2.2 `apps/relay/src/index.ts` `handleSocket`: `consoleLogger.warn('ws.reject', { reason })` for origin and room refusals (no origin, no room id); verify `apps/relay/test/worker.test.ts` asserts the log line and the content-free contract
- [x] 2.3 `docs/runbooks/incident.md`: quota exhausted, relay down, bad deploy; where to look, `MAINTENANCE`, `wrangler rollback`; a line for the owner to add an external uptime check on `/healthz`; verify `pnpm verify`

## 3. Hashed assets off the request budget

- [x] 3.1 `scripts/quality/worker-requests.mjs`: count requests of a cold load of `/`, `/new` and `/boards` from the generated site with Playwright; write the figures in `docs/capacity.md` ("Per day"); verify the script output matches the table
- [x] 3.2 ADR "Hashed assets bypass the Worker": `run_worker_first: ["/*", "!/_nuxt/*"]`, headers from a generated `_headers`, and the measured answer for a missing `/_nuxt/` file under `not_found_handling: single-page-application`; if a missing chunk returns the shell, record "rejected" and stop the group; verify `pnpm adr:check`. Outcome: rejected ([ADR-0032](../../../docs/adr/0032-hashed-assets-bypass-the-worker.md)), a missing chunk returns the shell; the way forward (`not_found_handling: "none"`) is taken in [ADR-0034](../../../docs/adr/0034-hashed-assets-bypass-the-worker-asset-layer-404.md)
- [x] 3.3 Generate `_headers` for `/_nuxt/*` (the seven security headers of the Worker, **no `Cache-Control`**: `_headers` also decorates the 404 of a missing file and an immutable 404 is pinned by browsers, [ADR-0034](../../../docs/adr/0034-hashed-assets-bypass-the-worker-asset-layer-404.md)) in the step that writes `_csp.json`; set `run_worker_first: ["/*", "!/_nuxt/*"]` and `not_found_handling: "none"` in `wrangler.jsonc` (the self-host config keeps `true`, no quota there); the Worker gives an asset-layer 404 the branded page; verify the parity test `scripts/ci/test/asset-headers.test.ts` and `pnpm e2e:core` against `pnpm dev:worker`: headers present on an asset, 404 on a missing one, CSP still on HTML
- [x] 3.4 Extend `scripts/smoke.mjs` with the two asset checks (a missing `/_nuxt/` file is an uncacheable 404 and not HTML; the entry script is 200 JavaScript with `nosniff` and HSTS) and update `docs/capacity.md` and `docs/runbooks/incident.md`; verified by the `Container` workflow job (the self-host image runs `scripts/smoke.mjs`, no Cloudflare account needed; the Worker answers a missing chunk with `no-store`, accepted). Evidence: https://github.com/maoudia/RetroBoard/actions/runs/43165592888 (green)
