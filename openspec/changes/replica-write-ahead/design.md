# Design

## Why not only flush on `pagehide`

IndexedDB has no synchronous write, and a transaction that is not committed when the document unloads is dropped. `pagehide` and `visibilitychange` handlers can start a transaction but cannot wait for it, and at that moment an event still being sealed is not even in the pending list. The durable path therefore has to exist before the board shows the action, and it has to be synchronous: localStorage.

## Flow of an own event (`EncryptedRelayTransport.publishLocal`)

1. preview, sign (unchanged);
2. seal (moved before the board shows the event; the envelope was needed right after anyway);
3. `replica.stage(room, [record])`: synchronous journal write;
4. `log.insert` and `emit`: the board shows the event;
5. `remember` -> `flush` -> `replica.append`: the IndexedDB commit; `append` then removes the journal entry.

A tab left after step 4 loses nothing: the journal has the envelope. A tab left before step 4 shows nothing to lose.

## Where things live

- Application: `ReplicaStorePort.stage?` (optional so other implementations and fakes stay valid).
- Adapters (web): `withJournal(store, localStorage)` in `replica-journal.ts`, wrapped around the IndexedDB store in the composition root (`ports.client.ts`); `stage` on the sessionStorage store (already synchronous) and forwarded by `withSessionFallback`.
- Domain: untouched.

## Journal rules

- Key `retroboard:rep-wal:<room>`, a JSON array of `{ id, data }` (the same ciphertext records as the replica).
- `load` reads the journal before the store, so a record that the store commits in between is in one of them.
- At creation the journal is drained: each room's records are appended to the store, then removed (idempotent: records are keyed by id).
- `append` success removes its ids; failure leaves them (the session fallback and the next start take over).
- `delete` removes the room's journal. The retention sweep needs nothing: a drained journal re-marks its room as used.
- Every localStorage access is best effort; without storage the replica behaves as before.

## Security and privacy note

The journal holds the envelopes the relay already sees: ciphertext under the room content key, with the room id in the storage key. Nothing readable is added, nothing is sent, and the server stores nothing.
