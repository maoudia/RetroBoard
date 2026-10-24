# Proposal

## Why

The owner requires "no storage on our side" and "replication to resuscitate board state". Today the Durable Object persists boards in SQLite for 24 h. With E2E encryption in place, the relay no longer needs to understand the board; it can be a memory-only forwarder while every participant keeps an encrypted replica that can bring a board back.

## What Changes

- **BREAKING**: the Durable Object stops persisting anything (no storage API calls) and stops reducing commands; it forwards encrypted envelopes and keeps a bounded in-memory catch-up buffer.
- Event-sourced board: each browser folds events through the domain in a deterministic total order (hybrid logical clock + event id).
- Encrypted replica in IndexedDB with configurable retention (default 30 days) and `navigator.storage.persist()`.
- Resurrection protocol: when the relay has no memory, connected peers re-seed it and each other using version vectors.
- Encrypted "board file" (`.retro`) export/import to keep or restore a board.
- Snapshots signed by the facilitator to bound history size.

Out of scope: P2P transport for events (cursors only, see `p2p-presence-and-cursors`), multi-device sync of a person's replicas.

## Capabilities

### New Capabilities

- `board-replication`: where board state lives, how it converges, how it survives the relay losing memory, and how it is kept or restored by people.

### Modified Capabilities

- `board-session`: board expiry is no longer a server-side 24 h timer; a board lives while a replica exists.

## Impact

- Contexts: all event producers; packages `sync`, `protocol`, `application`; `apps/relay` rewritten as a forwarder.
- Free-plan budget: request count unchanged; duration lower (no storage I/O, hibernation friendlier).
