# Tasks

## 1. Sync core

- [x] 1.1 Implement HLC, ULID ordering and version vectors in `packages/sync` with property-based tests (fast-check); verify convergence properties on random event permutations
- [x] 1.2 Implement the fold with checkpoints and re-fold on late events; verify unit tests and a benchmark of 5,000 events under 200 ms in Node
- [x] 1.3 Implement per-author rate limits in the fold; verify flood events are ignored identically on all replicas

## 2. Relay v2

- [x] 2.1 Rewrite `apps/relay` Room as a memory-only forwarder with ring buffer and `need-state`; verify unit tests and the "no storage API" CI check
- [ ] 2.2 Implement resync messages (`hello`, `need`, `have`) in the web relay adapter; verify an e2e test that restarts `wrangler dev` mid-retro and checks every page shows the same board within 5 s

## 3. Local replica

- [x] 3.1 Implement the IndexedDB `ReplicaStorePort` adapter with key wrapping, persistence request and retention cleanup; verify unit tests (fake-indexeddb) and an e2e reload test
- [x] 3.2 Add the retention setting to the profile (fr, en); verify e2e that "when I leave" deletes the replica on tab close

## 4. Board file and snapshots

- [x] 4.1 Implement board file export/import (encrypted) and the restore flow; verify e2e export then restore into a fresh room
- [ ] 4.2 Implement signed snapshots and snapshot-based join; verify unit test with 3,000 events and e2e late joiner

## 5. Cleanup

- [ ] 5.1 Remove the SQLite repository and the server-side reducer path; update docs/ARCHITECTURE.md and the privacy page; verify `pnpm verify` and the full e2e suite
