# Design

## Decisions

### D1. The relay is a pipe, the log is the truth

The board is the signed event log held by each participant. The relay never orders, validates or keeps anything durable. It forwards ciphertext, keeps a bounded memory buffer, and sends that buffer as `hist` on welcome. Losing the relay's memory loses nothing, because any connected holder re-seeds it (D3).

### D2. Two paths for every board event

`publish(envs)` always does both:

- `mesh.broadcastReliable(...)` to every open link;
- relay `pub`.

Inbound events from either path go through `ingest`, which drops ids already in the log. Partial-mesh forwarding, `relayOnly` and the bridge (`bridgeOf`, `checkBridge`, `republishAll` on bridge change) are deleted. The mesh keeps:

- cursors and focus (unreliable channel);
- the `have`/`env`/`synced` exchange when a link opens, which makes the mesh a faster path to a full board.

### D3. Anti-entropy

- **On welcome:**
  - The client records the ids received in `hist` (up to `done`).
  - It then pushes every envelope of its log whose id was not in `hist`, in frames of 100.
  - This one rule covers both the outbox (D4) and re-seeding an evicted relay.
- **On join (a `peers` frame with a new connection id):**
  - The seeder re-pushes its whole log.
  - The seeder is the lowest connection id among peers that announced `ready` in their presence.
  - The relay's `buffer.add` returns only fresh ids, so a relay that still holds the board fans out nothing.
- **Jitter:** a random 0 to 800 ms delay before pushing. Ids received during the delay are skipped, so several holders reconnecting together do not all upload the whole board.

### D4. Local-first send (outbox)

`send()` returns true whenever the log has a genesis and the transport is not closed or denied. The event is folded locally, written to the replica, and published if a path is open. If no path is open, the next welcome pushes it (D3): there is no separate queue to keep consistent. The UI shows the connection status but never blocks typing or publishing because of it.

### D5. Ready states

| State | Condition | UI |
|---|---|---|
| `open` | log has a genesis | board, editable |
| `waiting` | `hist` done, no genesis yet, others present or not creator | "Waiting for someone who has this board", drafts allowed |
| `creating` | alone, `hist` done, empty log, this tab created the board | publishes the genesis, then `open` |
| `denied` | envelopes arrived and none opened | passcode screen, as today |

`ConnectionStatus` gains `waiting`. The connection status (WebSocket) and the board status are separate values, so a reconnect does not hide the board.

### D6. Only the creator publishes a genesis

`EncryptedDeps.creator: boolean` is true when the setup handoff (`retroboard:init:<room>` in sessionStorage) exists for this tab. A facilitator link opened anywhere else never creates a board: it waits for a holder or a board-file import. This removes the fork of a second genesis plus `board.init`.

### D7. Replica write-through

- Own events are appended immediately.
- Inbound events are batched every 250 ms.
- `close()` flushes the batch unless the board was destroyed (`forgotten`). IndexedDB runs readwrite transactions on overlapping stores in creation order, so a `delete` issued after `close()` (the "until I leave" retention) still runs last.
- `pagehide` triggers the same flush.

### D8. Test harness

`apps/web/test/sync-harness.ts`:

- **FakeRelay:** the relay-core `EnvelopeBuffer` plus fan-out, with `evict()` and per-socket `drop()`.
- **FakeRTC:** a pair matrix that can block chosen links. Data channels are in-memory with async delivery.
- **Memory replica.**
- **Clock:** vitest fake timers.

Transports are real `EncryptedRelayTransport` instances with real WebCrypto and Ed25519. Each field failure becomes a scenario that must converge: every participant ends with the same snapshot hash.

## Where code lives

- Application: the unchanged `EventLog` and ports. The `ReplicaStorePort` gains `flush` semantics through the adapter only.
- Adapters (apps/web): the transport, mesh and IndexedDB replica.
- Sync package: pure helpers. `seederOf(conns, ready)` replaces `bridgeOf`.
- Relay: no change to frames.

## Security and privacy

The relay already saw ciphertext envelopes from relay-only participants. It now sees them from everyone, so it can observe the event count, sizes and timing per connection. That is the same observable set as before ADR-0017. Content, authors and votes stay end-to-end encrypted. Peers no longer need a direct link to collaborate, so the "hide my IP" setting loses nothing.

## Risks

- **Relay traffic grows.** Budget in the proposal; cursors stay off the relay.
- **Upload on reconnect for large boards.** The jitter and the seeder rule limit it. The relay buffer cap (`RELAY_BUFFER`) bounds memory, and peers fill the gaps over the mesh.
