---
status: accepted
date: 2026-11-11
decision-makers: Moncef Aoudia
---

# Hashed assets bypass the Worker, asset layer 404

## Context and Problem Statement

Every request of a page invokes the Worker (`run_worker_first: true`), the 35 to 40 hashed files under `/_nuxt/`
included, so a page load costs 36 to 42 of the 100,000 daily requests of the Workers Free plan (about 2,700 page loads a
day, `docs/capacity.md`). [ADR-0032](0032-hashed-assets-bypass-the-worker.md) rejected `run_worker_first: ["/*", "!/_nuxt/*"]`
because under `not_found_handling: "single-page-application"` the asset layer answers a missing chunk with the shell
(`200 text/html`), and it named `not_found_handling: "none"` as the way forward. This ADR takes that way and supersedes
the outcome of ADR-0032 (change `prod-guardrails`, task group 3, issue #621).

## Decision Drivers

* The free-plan request budget (ADR-0018: no paid service).
* A missing chunk must answer 404, never the application shell, and no cache may keep that answer.
* The seven security headers of the Worker stay on every hashed file.
* Unknown app paths keep the branded 404.

## Considered Options

* Keep `run_worker_first: true` (status quo).
* `["/*", "!/_nuxt/*"]` with `single-page-application` and `_headers` with an immutable cache (ADR-0032 option, rejected).
* `none` with a generated `_headers` without `Cache-Control` and a one-line Worker change: `["/*", "!/_nuxt/*"]` with
  `not_found_handling: "none"`, and a Worker that gives the branded 404 to any 404 of the asset layer.
* The same with `not_found_handling: "404-page"`.
* The same with `immutable` in `_headers`.
* Exact-file negative patterns (one `!/_nuxt/<file>` per chunk), keeping the SPA fallback.

## Decision Outcome

Chosen option: "`none` with a generated `_headers` without `Cache-Control` and a one-line Worker change", because it is
the only variant measured to give a real, uncacheable 404 for a missing chunk and 1 Worker request per page load.

* `wrangler.jsonc`: `assets.run_worker_first: ["/*", "!/_nuxt/*"]`, `assets.not_found_handling: "none"`. Every app route
  (`APP_ROUTES`, `apps/relay/src/errors.ts`) is a prerendered file, so the Worker does not need to serve the shell.
* `apps/web/scripts/asset-headers.mjs` writes `_headers` for `/_nuxt/*` in `pnpm generate`, next to `_csp.json`, with the
  seven headers of `withSecurityHeaders`; `scripts/ci/test/asset-headers.test.ts` compares the two copies.
* `apps/relay/src/index.ts`: `res.status === 404 ||` before `isUnknownAppPath`, so a 404 of the asset layer still gets the
  branded page.
* No `Cache-Control` for `/_nuxt/*`. `_headers` also decorates the 404 of a missing file, and Chromium keeps an immutable
  404 in its cache: an old tab asking for a chunk of a version being rolled back would fail until the cache is cleared.
  The platform default (`max-age=0, must-revalidate`) applies and a revisit costs asset-layer 304s, which are free.

Measured on 2026-11-11 (Wrangler 4.158.0, `wrangler dev`, Chromium, the generated site; `x-worker` added by a wrapper
Worker to count real Worker answers):

| Missing chunk `GET /_nuxt/does-not-exist.js` | Status | Body | `Cache-Control` |
| --- | --- | --- | --- |
| today (Worker first) | 404 | `text/plain` | `no-store` |
| ADR-0032 option (SPA fallback, immutable) | **200** | the shell | `immutable` |
| **`none` + Worker patch (chosen)** | **404** | empty | **none** |
| `404-page` | 404 | the shell | `max-age=0, must-revalidate` |
| `none` + `immutable` | 404 | empty | `immutable`, kept by the browser for each URL |

| Page (`node scripts/quality/worker-requests.mjs`) | Worker requests today | With the bypass |
| --- | --- | --- |
| `/` | 36 | 1 |
| `/new` | 36 | 2 |
| `/boards` | 42 | 2 |

A present chunk carries the seven headers from the asset layer (HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`,
`Cross-Origin-Opener-Policy`, `Permissions-Policy`, `X-Robots-Tag`); HTML keeps the CSP and `no-cache` from the Worker.
The core e2e suite passes on this configuration (80 passed, 1 skipped).

### Consequences

* Good, because a page load costs 1 or 2 Worker requests instead of 36 to 42: the free plan stops being bound by page
  loads, the WebSocket and Durable Object budgets are the limit.
* Good, because a missing chunk is a real 404 with an empty body that no cache can pin, and negative patterns keep serving
  assets when the Worker quota is exhausted (Cloudflare documentation).
* Bad, because there is no `immutable`: a revisit sends about 35 conditional requests answered 304 by the asset layer
  (free, a little slower).
* Bad, because the Worker's HTTPS redirect no longer runs on `/_nuxt/*` (plain HTTP on a public host gets `200`, not `308`).
  The assets are public, the HTML entry still redirects, and HSTS covers repeat visitors.
* Bad, because `GET`s of `/_nuxt/*` no longer appear in the Worker logs and traces.
* Behaviour change: `/guide/` and `/guide/<missing>` answer 404 instead of the shell (the app only links
  `/guide/<locale>/`, which is a file).
* The seven header values exist twice (`headers.ts` and the generator); the parity test is what keeps them equal.
* `deploy/selfhost/wrangler.jsonc` stays on `run_worker_first: true` and the SPA fallback (no quota there); the Worker
  change is harmless in that mode.

## More Information

* Supersedes the outcome of [ADR-0032](0032-hashed-assets-bypass-the-worker.md), which stays as the record of the
  measurement under `single-page-application`.
* Exact-file negative patterns would keep the SPA fallback and allow `immutable`, but the build has 110 files under
  `_nuxt/` and `run_worker_first` accepts at most 100 entries.
* Verified locally only; the production asset layer is checked on a preview deployment (`npx wrangler versions upload`)
  before the merge, see the pull request.
* Later, optional: add the root files (`!/favicon.svg`, `!/manifest.webmanifest`, icons) to the negative list and to
  `_headers` (2 to 4 more Worker requests per cold load of a full browser).
* Workers static assets: <https://developers.cloudflare.com/workers/static-assets/> (routing, `run_worker_first`, `_headers`).
