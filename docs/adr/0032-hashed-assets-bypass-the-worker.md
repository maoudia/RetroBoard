---
status: rejected
date: 2026-11-11
decision-makers: Moncef Aoudia
---

# Hashed assets bypass the Worker

## Context and Problem Statement

`wrangler.jsonc` sets `assets.run_worker_first: true`, so every request of a page, the 35 to 40 hashed files under
`/_nuxt/` included, invokes the Worker. The Workers Free plan allows 100,000 requests a day, which is about 2,700 page
loads when a page costs 36 requests (measured below). Could `run_worker_first: ["/*", "!/_nuxt/*"]` serve the hashed files
from the asset layer without the Worker, with their security headers from a generated `_headers` file
(change `prod-guardrails`, task group 3)? The proposal allows it only if a missing chunk still answers 404.

## Decision Drivers

* The free-plan request budget (ADR-0018: no paid service).
* A missing chunk must answer 404, never the application shell (spec `platform-security`, "Request budget").
* The security headers of the Worker (HSTS, `nosniff`, framing, referrer) stay on every response.
* A cache must never keep an error as if it were a file.

## Considered Options

* Keep `run_worker_first: true` (every request goes through the Worker).
* `run_worker_first: ["/*", "!/_nuxt/*"]` with a generated `_headers` for `/_nuxt/*`.
* The same, with `not_found_handling: "none"` and the Worker serving the shell of each app route itself.

## Decision Outcome

Chosen option: "Keep `run_worker_first: true`", because the second option fails its own condition: under
`not_found_handling: "single-page-application"` the asset layer answers a missing `/_nuxt/` file with the shell.
The bypass is rejected as specified and task group 3 stops after the measurement (3.1) and this decision (3.2).

Measured on 2026-11-11 with Wrangler 4.158.0 (`wrangler dev`, the same asset layer as production) on the generated
site, `run_worker_first: ["/*", "!/_nuxt/*"]`, a file that does not exist, `GET /_nuxt/does-not-exist.js`:

| Request headers | Answer |
| --- | --- |
| none | `200 text/html` (the shell) |
| `Sec-Fetch-Mode: no-cors`, `Sec-Fetch-Dest: script` (a `<script>`) | `200 text/html` |
| `Sec-Fetch-Mode: cors`, `Sec-Fetch-Dest: empty` (a dynamic `import()`) | `200 text/html` |
| `Sec-Fetch-Mode: navigate`, `Sec-Fetch-Dest: document` | `200 text/html` |
| the same, with `_headers` giving `/_nuxt/*` an immutable cache | `200 text/html`, `Cache-Control: public, max-age=31536000, immutable`, no CSP |

Outside the bypass (today, the Worker runs first) the same request answers `404 text/plain`, because the Worker turns a
shell answered for a path that is not an app route into a 404 (`isUnknownAppPath`).

What the bypass would have saved, from `scripts/quality/worker-requests.mjs` (cold load, then the next visit of the same
browser; the files carry `Cache-Control: public, max-age=0, must-revalidate`, so a revisit costs as much as a cold load):

| Page | Worker requests today | With the bypass |
| --- | --- | --- |
| `/` | 36 | 1 |
| `/new` | 36 | 2 |
| `/boards` | 42 | 2 |

The headers a `_headers` file would have to reproduce are the seven the Worker adds to a hashed asset today
(`Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Cross-Origin-Opener-Policy`, `Permissions-Policy`, `X-Robots-Tag`); that part works (a `_headers` entry is served on an
existing file). It is not the blocker.

### Consequences

* Good, because a missing chunk (a tab opened before a deploy asking for a file that the new build no longer has) keeps
  answering 404. With the bypass it would receive HTML where JavaScript is expected, with an immutable cache header
  if `_headers` sets one for `/_nuxt/*`: a cache that honours it keeps the shell as the answer for that file for a year.
* Good, because the Worker keeps its checks on every request (HTTPS redirect, maintenance mode).
* Bad, because the free-plan budget stays at about 2,700 page loads a day (`docs/capacity.md`), cold or not.

## More Information

* Change `prod-guardrails`, task group 3; the two tasks left (3.3 `_headers`, 3.4 smoke checks) depend on this decision
  and stay open.
* A way forward, to be proposed as its own change: `not_found_handling: "none"` with the Worker answering the shell for
  the app routes that need it (`APP_ROUTES` in `apps/relay/src/errors.ts`; every one of them is also prerendered as a
  file), so the asset layer answers 404 for any missing file and the bypass becomes safe. It changes how every unknown
  path is answered, so it needs its own proposal and a preview deployment.
* Not measured: the production asset layer. `wrangler dev` ran the same code path locally; a preview deployment would
  confirm it (owner action: `pnpm generate && npx wrangler versions upload`, then request a missing `/_nuxt/` file on the
  preview URL).
* Workers static assets: <https://developers.cloudflare.com/workers/static-assets/> (routing, `run_worker_first`,
  `_headers`).
