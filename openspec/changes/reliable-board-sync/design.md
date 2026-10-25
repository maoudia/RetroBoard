# Design

## Decisions

### D1. The relay is a pipe, the log is the truth

The board is the signed event log held by each participant. The relay never orders, validates or keeps anything durable. It forwards ciphertext, keeps a bounded memory buffer, and sends that buffer as `hist` on welcome. Losing the relay's memory loses nothing, because any connected holder re-seeds it (D3).

### D2. Two paths for every board event

`publish(envs)` always sends to every open link (`mesh.broadcastReliable`). It also sends to the relay (`pub`) whenever **my links are incomplete**: no mesh at all, or fewer open links than other participants in the room (`linked < conns - 1`).

Why this is enough: a missing pair is missing for both of its ends, so both ends see themselves as incomplete and use the relay, and every participant with complete links already gets the event over the mesh. A participant without WebRTC can never be linked, so as long as one is in the room everybody is incomplete and every event also crosses the relay. When every pair is linked, no board event touches the relay and the free-plan budget of ADR-0017 is unchanged.

Inbound events from either path go through `ingest`, which drops ids already in the log. Partial-mesh forwarding, `relayOnly` and the bridge (`bridgeOf`, `checkBridge`, `republishAll` on bridge change) are deleted. The mesh keeps:

- cursors and focus (unreliable channel);
- the `have`/`env`/`synced` exchange when a link opens, which makes the mesh a faster path to a full board.

### D3. Anti-entropy

- **On welcome:**
  - The client records the ids received in `hist` (up to `done`).
  - It then pushes every envelope of its log whose id was not in `hist`, in frames of 100.
  - This one rule covers both the outbox (D4) and re-seeding an evicted relay.
- **On join (a `peers` frame with a new connection id, whether or not events flow through the relay at that moment):**
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

### D9. Local events never sort before what the log holds

`HybridClock.receive` caps what a peer learns at wall + 60 s (so a clock running far ahead cannot drag everyone's timers). The side effect, found by the harness: a device whose clock is more than a minute *behind* stamps its events before the genesis. They sort first in the total order, every replica ignores them (`no-genesis`), and nothing tells the author, because `EventLog.preview` only checks the head of the log. The same cap breaks causality for anything that references events from a clock more than a minute ahead (votes and edits on its notes sort before the note and are dropped).

Rule: `publishLocal` stamps `at = max(clock.tick(), log.lastAt + 1)`, so a local event always sorts after everything already in the local log. The cap stays for `receive` (timers keep following the wall clock in the normal case). Timer values derived from an outlier clock are accepted as a known cost; data loss is not.

## Findings of the harness (task 1.3)

Seven scenarios in `apps/web/test/sync-field.test.ts`, each failing for the stated reason:

1. Partial mesh: a note does not reach a participant with no direct link to its author.
2. Hibernation (sockets kept, buffer gone) then a relay-only joiner: the bridge announced itself once and never pushes again, the joiner sees nothing. Whether it self-heals depends on the random connection ids (the bridge is recomputed before the joiner's presence arrives, so the board only reaches the joiner when the joiner's id happens to sort first). The harness uses ascending ids to make the failure repeatable.
3. A command sent during a WebSocket blip is refused (`send()` is false until the re-sync).
4. A reload within the 250 ms write batch loses genesis, `board.init` and notes when nobody else is online.
5. A facilitator link on a second device builds its own board when it finds an empty relay.
6. A device with a clock one hour behind: its notes vanish for everyone, silently.
7. A failing IndexedDB write is swallowed: the participant is never told the board is not saved.

The owner's exact loss ("same URL, same browser, my notes gone") is explained by 4 or 7, and by 5 combined with a setup dialog; the log cannot tell which one happened. Task 4.3 (field re-test) closes it, and 3.2 makes any future storage failure visible.

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
