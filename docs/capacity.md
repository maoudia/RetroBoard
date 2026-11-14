# Capacity

How many people a board takes, and how many retros the free Cloudflare plan carries per day.
Measured on 2026-10-24 with `pnpm load:relay` (scripts/load/relay-load.mjs) against `wrangler dev`.

## Per board

| Limit | Value | Where |
|---|---|---|
| Participants (open tabs) per board | **30**, hard cap | `LIMITS.maxConnections`, relay admission |
| Notes / actions / columns | 300 / 100 / 8 | `LIMITS` |
| Board messages per socket | 80 frames / 10 s, socket closed above (abuse) | `packages/protocol/src/budgets.ts` `FRAME_MAX` (also applied by the in-tab relay of solo boards) |
| Live frames (cursors, focus) per socket | 60 / 10 s, excess dropped silently | `packages/protocol/src/budgets.ts` `EPH_MAX` |
| Events kept by the relay for late joiners | 2,000 envelopes or 4 MB, then peers re-seed | `RELAY_BUFFER`, `RELAY_BUFFER_BYTES` |
| Cursor rate per participant | 4 Hz up to 10 people, 2 Hz up to 20, 1 Hz above | `cursorInterval()` |

With the mesh, up to 12 people every browser links to every other; above, each links to
7 or 8 peers (ring neighbours and the opposite peer) and events are forwarded hop by hop.

A 31st participant sees "this board is full" and gets in automatically when a seat frees up
(retry every 15 s, not a tight loop).

### Load test results (relay path, local relay, one generator process)

These measure the relay as it was before the mesh, which is now the fallback path only.

Each simulated participant sends cursor frames at 4 Hz while "moving" (50% of the time unless
stated), a focus heartbeat every 15 s and ~6 board events per minute; payloads have realistic
encrypted sizes. Latency is send to receive, through the relay.

| Scenario | In / s | Out / s | Delivered | Cursor latency p50 / p95 / p99 |
|---|---|---|---|---|
| 5 people | 10 | 40 | 100% | 5 / 9 / 14 ms |
| 10 people | 23 | 210 | 99.6% | 7 / 18 / 78 ms |
| 20 people | 37 | 705 | 100% | 12 / 26 / 46 ms |
| 30 people | 63 | 1,837 | 100% | 23 / 50 / 61 ms |
| 30 people, all moving all the time | 122 | 3,547 | 100% | 29-35 / 71-83 / 87-345 ms |
| 31st person | - | - | refused with "full" | - |
| 10 boards x 10 people | 21 per board | 185 per board | 100% | 28 / 62 / 151 ms |

No disconnection and no rate-limit close in any scenario. The 4 Hz worst case predates the
adaptive rate: at 30 people the browser now sends 1 Hz, about 30 frames per second in total
for each receiver.

Local runs put every board in one workerd process; in production each board is its own
Durable Object (soft limit 1,000 requests per second per object). A local run with 300 people
on 30 boards saturates the single local process (p50 ~200 ms) and says nothing about production.

### Parity of the two relay adapters (container images, one generator process)

Measured on 2026-11-14 with `pnpm load:relay --clients 30 --boards 1 --seconds 10` (one board of 30 people, the
scenario above) against the self-host image running each adapter ([ADR-0036](adr/0036-cloudflare-is-one-deploy-target-relay-core-runtime-neutral.md)),
on an arm64 Podman VM with 2 GB of memory. The `:node` image is the default of the `Dockerfile`; the workerd image is
`docker build --target workerd .` (published as the `:workerd` tag for one release).

| | Node adapter (default image) | workerd (`:workerd` image) |
|---|---|---|
| Connected | 30 / 30 | 30 / 30 |
| Refused, errors, closes during the run | 0 | 0 |
| In / s, out / s (per board) | 63, 1,836 | 63, 1,839 |
| Cursor latency p50 / p95 / p99 | 20 / 32 / 34 ms | 38 / 57 / 61 ms |
| Board event latency p50 / p95 / p99 | 5 / 19 / 20 ms | 11 / 52 / 52 ms |
| Image size | 293 MB | 529 MB |
| Memory after start (container) | 21 MB (process RSS 65 MB) | 374 MB |
| Memory after the run (container) | 27 MB (process RSS 76 MB, peak 76 MB) | 443 MB |

Two more Node runs gave the same shape (30 / 30, 0 errors, 1,641 and 1,789 out per second, cursor p99 30 to 31 ms). In the
first Node run 95% of the board events reached every receiver by the end of the 10 seconds (the generator stops while the
last ones are in flight); the other runs delivered 100%. The Node adapter is lighter by an order of magnitude in
memory, 45% smaller on disk and at least as fast; the numbers are one short local run, not a benchmark.

**Single-instance limit.** The Node adapter keeps every room in the memory of one process: a board lives on one instance
and is lost when it restarts (the relay stores nothing anyway). It cannot be scaled out behind a plain round-robin
balancer; every connection of a room has to reach the same instance (room affinity, recipes in `docs/self-hosting.md`).
One instance carries the 30 people of a board with room to spare; the per-address connection cap and connect rate
(`MAX_CONNECTIONS_PER_ADDRESS`, `MAX_CONNECTS_PER_MINUTE`) are per instance too.

### Recommendation

- **Comfortable: up to 15 participants**, on any device including phones.
- **Supported: up to 30**, laptops recommended above 20 (each browser decrypts every frame).
- Above 30: split into sub-teams (one board each) or raise the cap after a production load test.

## Per day, on the free Workers plan

From the Durable Objects pricing page (checked 2026-10-24):
100,000 requests per day, 13,000 GB-s of duration per day, incoming WebSocket messages billed
at 20:1, outgoing messages free, no duration billed while hibernated.

### Worker requests of a page

With `run_worker_first: ["/*", "!/_nuxt/*"]` (`wrangler.jsonc`, [ADR-0034](adr/0034-hashed-assets-bypass-the-worker-asset-layer-404.md))
the hashed files under `/_nuxt/` are served by the asset layer, which is free and unlimited, and only the HTML (and any
other path) invokes the Worker. Measured on 2026-11-11 by `node scripts/quality/worker-requests.mjs` (Chromium, empty
browser context, `wrangler dev`, the site generated from version 1.51.3; the second visit is the same browser opening the
same page again). Before, with `run_worker_first: true`, every request counted:

| Page | Cold: requests | Cold: under `/_nuxt/` | Cold: Worker | Revisit: requests | Revisit: Worker |
| --- | --- | --- | --- | --- | --- |
| `/` | 36 | 35 | 1 (was 36) | 36 | 1 (was 36) |
| `/new` | 36 | 34 | 2 (was 36) | 36 | 2 (was 36) |
| `/boards` | 42 | 40 | 2 (was 42) | 42 | 2 (was 42) |

The hashed files carry no `Cache-Control` (a missing chunk must stay an uncacheable 404, so there is no `immutable`): a
revisit sends conditional requests that the asset layer answers `304`, at no Worker cost. A page load now costs 1 or 2
Worker requests, plus 1 for the `/ws2` socket when a board is joined, so 100,000 requests a day allow tens of thousands of
page loads, about 35 times the 2,700 of before. The binding limits become the WebSocket and Durable Object budgets
(below). Not measured: the favicon, manifest and icon fetches of a full browser (2 to 4 more Worker requests per cold load).

The bypass is checked after the fact, not only at build time: `scripts/smoke.mjs` (after every deploy and every 6 hours)
proves that a missing `/_nuxt/` file is an uncacheable 404 and that the entry script keeps its security headers, and the
`Container` workflow runs the same checks against the self-host image, where `run_worker_first: true` makes the Worker
answer the missing file itself with `no-store` (no quota there, `docs/self-hosting.md`).

### Since the peer-to-peer mesh (owner decision: no paid service, no lock-in)

Board events, cursors and focus travel between browsers (WebRTC). The relay only sees, per
participant and per session: one connection, one encrypted offer or answer per direct link
(at most 29), and a presence frame when someone joins. Keep-alive pings are answered by
Cloudflare's auto-response and cost nothing.

Estimate for a one-hour retro of 10 people:

- Messages: about 60 incoming per person, so ~600, about **30 billed requests** (and 10 connections).
- Duration: the object is awake for a few seconds at each join, then hibernates (no messages);
  say a few minutes per retro instead of the full hour.

So the free plan is no longer the limit for a team or a company: requests allow thousands of
participant sessions per day, and duration hundreds of retros (to be verified in production: the
hibernation delay after the last message is set by Cloudflare). Nothing requires the paid plan.

When a participant's links are incomplete (strict corporate network, the "Direct links" setting
off, or a single pair that never connects), the events of the affected participants also go
through the relay, buffered in memory (ADR-0024). The relay is then awake for as long as they
write, which is what bounds the free plan: about 28 fully active one-hour retros per day at
128 MB in the worst case (every participant relayed, writing the whole hour); real retros write in
bursts and cost far less. Cursors never use the relay. To be measured in production.

What it costs in privacy: with direct links, participants see each other's IP address (as in a
video call) and the STUN server (default `stun.cloudflare.com`, free, replaceable with a
self-hosted one through `NUXT_PUBLIC_ICE_SERVERS`) sees it too. There is no TURN server:
nothing to pay, nothing to host.

### Before the mesh (relay carried everything)

For the record: ~1,700 billed requests per 10-person retro-hour, and cursors kept the object
awake the whole hour, so about **25 one-hour retros per day** on the free plan (duration was
the limit).

## Sources

- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing)

## Re-running

```bash
pnpm generate && npx wrangler dev &          # or use a preview deployment
pnpm load:relay --clients 30 --seconds 30
pnpm load:relay --clients 30 --moving 1      # everybody moving all the time
pnpm load:relay --url wss://<host>/ws2 --origin https://<host> --clients 20
node scripts/quality/worker-requests.mjs [https://<host>]   # Worker requests of a page (starts wrangler dev without a URL)
```
