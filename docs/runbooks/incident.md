# Incident runbook

Source: change `prod-guardrails`. Boards live in the participants' browsers, so an incident on the service never loses
board content: it stops people from collaborating until it is fixed. Say so to anyone who asks.

## How you find out

- `Production smoke` (`.github/workflows/smoke.yml`) runs every 6 hours and after every deploy. It proves the site, the
  security headers, that a missing `/_nuxt/` file is an uncacheable 404 (never the shell) and that the entry script keeps
  `nosniff` and HSTS, that `/ws2` refuses a foreign origin (403), that a board connection opens (`welcome`, then `hist`)
  and that a live frame crosses between two connections. A red run is an incident until proven otherwise. The `Container`
  workflow runs the same script against the self-host image on pull requests that touch it, without a Cloudflare account.
- Nothing else pages anyone. **Owner task:** add an external uptime check on `https://retroboard.maoudia.com/healthz` (any
  free monitor, check every minute, alert by e-mail or phone).
- Workers logs (`wrangler.jsonc` `observability`) carry event names and short room hashes only. Useful events:
  `ws.reject` (refused upgrade, with `reason` `origin` or `room`), `ws.full`, `ws.open`, `rate.limited`, `msg.too-large`.

## What to check first

| Symptom | Likely cause | Action |
|---|---|---|
| Smoke fails on `/ws2` after a deploy | The deploy broke the relay | The deploy workflow rolls back by itself; if it did not, roll back by hand (below) |
| Pages and the relay answer errors for everyone, quota messages in the dashboard | The free plan's 100,000 requests/day is used up (every request except the hashed files under `/_nuxt/` invokes the Worker, `wrangler.jsonc` `run_worker_first`; the hashed files keep being served once the quota is gone) | Check Workers > retroboard > Metrics. Apply the edge rules of `docs/runbooks/edge.md` (Bot Fight Mode, rate limiting rule). The quota resets at 00:00 UTC |
| Many `ws.reject` with `reason: origin` | A page on another site is opening the relay, or a misconfigured `ALLOWED_ORIGINS` | Compare with the origin list in `wrangler.jsonc` `vars.ALLOWED_ORIGINS`; the edge rule on `/ws2` blocks the rest |
| Boards show "reconnecting" for everyone at once | A deploy just restarted the relay | Wait 30 seconds; participants reconnect and re-sync by themselves |
| Users report "this board is full" | 30 connections is the hard cap (`LIMITS.maxConnections`) | Expected; stale tabs count, ask people to close them |

## Roll back a bad deploy

- Automatic: a failed smoke test after `deploy.yml` runs `wrangler rollback` and keeps the run red.
- By hand: `npx wrangler rollback` (needs an API token), or Cloudflare dashboard > Workers > retroboard > Deployments >
  previous version > Rollback. This rolls back the static assets too.
- A Durable Object migration (`migrations` in `wrangler.jsonc`) cannot be rolled back: review it in the pull request and
  deploy it alone.

## Buy time while you fix

- `MAINTENANCE=1` (see `docs/runbooks/maintenance.md`): pages answer 503 with a branded page, legal pages stay up.
- After the fix: `node scripts/smoke.mjs https://retroboard.maoudia.com` must exit 0.
