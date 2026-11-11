# Proposal

## Why

Found while fixing the nightly solo carry-over test (PR 640, which only made the test wait): an action added on a solo board is shown before the browser has committed it to the IndexedDB replica. The page shows it after signing, then seals it, then `append` opens a transaction (about 16 ms, longer while the main thread paints, as at 2560 px). A tab closed or reloaded in that gap drops the write: the action is gone from this browser's copy, and a reload or the carry-over finds nothing. `board-replication` says a board is never lost because its tab was closed; the existing `pagehide` flush (`boards.vue`) cannot help, because it can only start an asynchronous write and an envelope still being sealed is not pending yet.

`openspec/changes/local-data-durability` is the nearest home (same capability, same subject), but it is an unstarted draft about drafts and showing persistence. Ticking a task there would raise the WIP count (15, ceiling 15 in `quality/wip-baseline.json`) and the work is a separate defect fix, so this is its own small change, complete in this pull request.

## What Changes

- What the board shows has a synchronous copy on this device first: the event is sealed (it already is, before it is sent) and its ciphertext envelope is staged in a write-ahead journal (localStorage), then the board shows it, then the IndexedDB replica commits it and the journal entry goes.
- `load` returns committed and staged records; the next page start commits whatever a closed tab left in the journal.
- Port: `ReplicaStorePort.stage?` (optional, synchronous). Adapters: `withJournal` over the IndexedDB store, `stage` on the sessionStorage store and on the session fallback.
- Regression e2e: an action added, the tab left the instant it is shown, the board reopened: the action is there.

Out of scope: other locally persisted data that is written after an asynchronous step (the sealed recent boards list, and the sealed drafts planned in `local-data-durability`) and the durability of events received from other participants (their holders and the relay still have them). No change to retention, and no new storage on the server.

Bounded contexts: Board session (replica). Relay traffic: none. Free-plan budget: no change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-replication`: an action the board shows is kept even if the tab goes away before the replica commits it.

## Impact

- `packages/application/src/ports/replica.ts`, `apps/web/app/adapters/replica-journal.ts` (new), `replica-session.ts`, `plugins/ports.client.ts`, `transport/encrypted.ts` (`publishLocal`).
- Tests: unit `replica-journal.test.ts`, e2e `solo-parity.spec.ts`.
