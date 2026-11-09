# Proposal

## Why

Production is deployed several times a day (4 on 2026-11-09) and a retro lasts an hour, so a deploy during a retro is the normal case. Three things go wrong today.

- A deploy restarts the Durable Object and closes every WebSocket. The client then closes its own healthy peer links: `ws.onclose` in `apps/web/app/transport/encrypted.ts:856-861` runs `this.mesh?.close()`. Everyone shows "reconnecting" and re-syncs although the board travels peer to peer.
- A newer client can publish an event an older tab cannot parse. `ingest` (`encrypted.ts:344-349`) drops it without storing it and without telling anyone; live schemas are strict (`packages/protocol/src/envelope.ts`), so even an added presence field hides a participant from older tabs. Boards diverge until each tab reloads. Three queued changes add commands (#532, #558, #286).
- `push` (`encrypted.ts:396-401`) cuts uploads by count (100 envelopes) while the relay refuses frames over 256 KB (`envelope.ts:22`) and closes a socket after 80 frames in 10 s (`budgets.ts:18`). `ws.onopen` resets `attempts` (`encrypted.ts:845`), so a refused upload reconnects at once and uploads again.
- The relay keeps its buffer after the last participant leaves (`relay-room.ts:84-91`), although the README says it forgets the room.

## What Changes

- Peer links survive a relay reconnect: they are kept for a grace period and matched to the new connection ids by the session key announced in presence.
- An event that decrypts and verifies at the envelope level but whose body is unknown is kept (replica and forwarding) and the page shows "A participant uses a newer version: reload" (fr/en). Live frames are parsed tolerantly.
- Uploads to the relay are cut by bytes, paced under the frame budget, and a close for size or rate does not reset the backoff.
- The relay clears its buffer when the last socket closes.

Out of scope: protocol v3, snapshots (task 4.3 of `p2p-presence-and-cursors`), fewer deploys (a workflow decision for the maintainer).

Bounded contexts: Sync (transport, mesh), Platform (relay). Relay traffic: lower (no full re-sync after a deploy; uploads spread over time). What the relay can observe is unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-replication`: convergence across client versions, behaviour during a relay restart.
- `board-session`: the relay forgets a room when the last participant leaves.

## Impact

- `apps/web/app/transport/encrypted.ts`, `apps/web/app/transport/mesh.ts`, `packages/protocol/src/envelope.ts`, `packages/sync`, `apps/relay/src/relay-room.ts`, `packages/protocol/src/buffer.ts`, i18n fr/en (one banner).
- Rollout in two releases: tolerant parsing and "keep unknown" first, anything that relies on them later.
