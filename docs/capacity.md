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

A 31st participant sees "this board is full" and gets in automatically when a seat frees up
(retry every 15 s, not a tight loop).

### Load test results (local relay, one generator process)

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

Estimate for a one-hour retro of 10 people (pointer moving ~20% of the time):

- Messages: ~3,200 per person per hour, so ~32,000 incoming, about **1,700 billed requests**.
- Duration: cursors keep the board's object awake for the whole hour. Every object is billed
  for 128 MB of memory whatever it uses, so
  13,000 GB-s is about **28 object-hours per day**.

So the free plan carries roughly **25 one-hour retros per day in total** (any size up to 30),
and duration, not requests, is the limit. Ways to raise it, in order of effort:

1. Peer-to-peer cursors (WebRTC, `p2p-presence-and-cursors` 1.x): the relay only carries board
   events, the object hibernates between them, duration drops by an order of magnitude.
2. Workers Paid plan (minimum USD 5 per month): 1 million requests and 400,000 GB-s included per
   month, about 870 object-hours, so roughly 30 one-hour retros per day, then pay per use.

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
