# Proposal

## Why

Field test by the owner on 2026-10-25, with real devices on different networks, using peer-to-peer mode:

- Participants could not publish, or published notes that others never saw.
- The facilitator lost the notes he had created, in the same browser and on the same link where he created the board.
- Only one participant reached the board with a name, and even that participant did not see the full board.

Reading the transport (`apps/web/app/transport/encrypted.ts`) explains most of it. All the causes date from ADR-0017 (board events travel peer to peer only):

1. **Partial mesh splits the board silently.** Up to 12 participants, every pair needs a direct WebRTC link and nobody forwards board events. We only ship STUN (no TURN), so pairs behind different NATs or mobile carriers often never link. A link that fails three times is abandoned, and the relay fallback starts only when a peer has zero links. Each participant then folds a different subset of events.
2. **Relay-only participants can get an empty board.** The relay buffer lives in Durable Object memory, which hibernation evicts. The bridge pushes the board only when it becomes the bridge, not for each new relay-only joiner. A late joiner can therefore receive no genesis, and every command fails with `no-genesis`.
3. **A WebSocket blip makes the board unusable.** Any relay disconnect tears down the whole mesh and sets `synced = false`. Until it re-syncs, `send()` returns false and the UI drops the command silently.
4. **Local writes can be lost.** The replica batches writes for 250 ms, and `close()` discards the pending batch.
5. **A board can fork.** Any tab holding the facilitator link that finds itself alone, with an empty relay and an empty replica (for example a new device), publishes a new genesis and a new `board.init`. Notes written there reference columns that disappear once the older genesis comes back.
6. **No test covers any of this.** The 700-line transport has no unit tests. The e2e tests run on localhost, where every WebRTC link opens.

The owner's requirement: 0 EUR, fully distributed and reliable.

## What Changes

- **Distributed state, unchanged in principle.** Every participant holds the full signed, encrypted event log and folds it with the same domain rules. There is no server authority and no server storage.
- **Two delivery paths, the relay only when needed.**
  - Every event goes to every open direct link. It also goes to the relay when this participant's links are incomplete (a missing pair makes both ends use the relay).
  - When every pair is linked, no board event touches the relay.
  - The relay stays a memory-only forwarder of ciphertext.
  - Peers deduplicate by event id.
  - The mesh carries cursors and focus, and is a second path for board events.
  - The relay-only mode and the bridge are removed.
- **Anti-entropy on every connection.**
  - After the relay history, each client pushes the events it holds that the history lacked. This re-seeds a relay that lost its memory, so every connection backs up the board.
  - When someone joins, one deterministic holder (the "seeder", lowest connection id among ready peers) re-pushes the board. The relay forwards only ids it does not hold.
  - When a direct link opens, the two ends exchange `have` lists both ways, as today.
- **Local-first publishing (outbox).** Once a board has a genesis, a command is always accepted: it is signed, folded, written to the replica, and delivered as soon as a path exists. Reconnecting never drops commands, and the board stays editable while reconnecting, with a visible status.
- **Durable local writes.**
  - The replica writes own events immediately.
  - Pending writes are flushed on close and on `pagehide`, never dropped, except after a destroy or under the "until I leave" retention.
- **No accidental forks.** Only the tab that created the board (the setup handoff in this tab) may publish a genesis. Any other tab with no events waits in a "waiting for someone who has this board" state, with drafts still allowed. It never creates a new board.
- **Tests that model the field.**
  - A transport harness runs several real transports in Node: a fake relay that can be evicted, a fake RTC that fails chosen pairs, a memory replica, and a controllable clock.
  - Playwright scenarios: no WebRTC in one context, offline toggles, reload right after publishing.
- **New ADR-0024**, "Board events on two paths, anti-entropy on every connection". It supersedes ADR-0017; cursors stay peer to peer, as in ADR-0002.

## Out of scope

- TURN servers, which would be paid or third-party (ADR-0018).
- Server-side storage of any kind.
- Changing the fold rules or the event format, except an optional field.
- Display names on notes (see `author-name-by-default`).
- Composer button order (see `draft-first-composer`).

## Bounded contexts

- Board replication: transport and sync.
- Access: the genesis rule on the client.
- Presence: relay-only flags removed.

The domain is unchanged.

## Free-plan budget

- **Complete mesh (the normal case):** no board event crosses the relay; the figures of `docs/capacity.md` hold.
- **Incomplete mesh or a participant without WebRTC:** events of the affected participants cross the relay once (incoming, billed 20:1) and fan out (outgoing, free). The relay is then awake for the activity, which is the duration that bounds the free plan (about 28 fully active one-hour retros per day at 128 MB, see the ADR); bursts make real retros much cheaper. To be measured in production.
- **Re-seeding:** one push of the board per connection and one per join from the seeder. Ids the relay already holds are not fanned out.
- **Cursors** stay peer to peer, so the per-participant relay rate stays under 4 messages per second.
- **To confirm against the Durable Objects pricing page:** incoming WebSocket messages are billed as requests at a 20:1 ratio, and outgoing ones are free.

## Capabilities

### Modified Capabilities

- `board-replication`: the persistence and resurrection rules change, and dual-path delivery, the outbox, durable local writes and a single creator are added.

## Impact

- Web: `transport/encrypted.ts` (rewrite of the delivery part), `transport/mesh.ts` (unchanged API), `plugins/ports.client.ts` (creator flag), `pages/board.vue` (waiting state, offline chip), i18n keys.
- Sync package: `bridgeOf` and the relay-only flags are removed.
- Relay: unchanged protocol. The buffer budget is reviewed.
- Docs: ADR-0024, `docs/PLAN.md` sync section, the p2p spec references.
