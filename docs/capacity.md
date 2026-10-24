# Capacity

How many people a board takes, and how many retros the free Cloudflare plan carries per day.
Measured on 2026-10-24 with `pnpm load:relay` (scripts/load/relay-load.mjs) against `wrangler dev`.

## Per board

| Limit | Value | Where |
|---|---|---|
| Participants (open tabs) per board | **30**, hard cap | `LIMITS.maxConnections`, relay admission |
| Notes / actions / columns | 300 / 100 / 8 | `LIMITS` |
| Board messages per socket | 80 frames / 10 s, socket closed above (abuse) | `relay-core.ts` `FRAME_MAX` |
| Live frames (cursors, focus) per socket | 60 / 10 s, excess dropped silently | `relay-core.ts` `EPH_MAX` |
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

### Recommendation

- **Comfortable: up to 15 participants**, on any device including phones.
- **Supported: up to 30**, laptops recommended above 20 (each browser decrypts every frame).
- Above 30: split into sub-teams (one board each) or raise the cap after a production load test.

## Per day, on the free Workers plan

From the Durable Objects pricing page (checked 2026-10-24):
100,000 requests per day, 13,000 GB-s of duration per day, incoming WebSocket messages billed
at 20:1, outgoing messages free, no duration billed while hibernated.

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

Participants who cannot open any direct link (strict corporate network, or the "Direct links"
setting off) use the relay fallback: their board events go through it, buffered in memory, and
they share no cursors. Each of them costs about what a relay-only participant cost before (a few
hundred messages per hour), still far below the free limits.

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
```
