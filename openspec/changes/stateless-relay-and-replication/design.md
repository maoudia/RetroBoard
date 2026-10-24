# Design

## Context

Requires `e2e-encrypted-rooms` (envelopes are opaque). Current reducer is pure and deterministic, a good base for event sourcing. See docs/PLAN.md 5.2 to 5.6.

## Goals / Non-Goals

**Goals:** zero server persistence; convergence; resurrection in seconds; bounded memory on the relay.
**Non-Goals:** offline merge of long divergent histories (supported but not optimised); CRDT text merging.

## Decisions

- **Event log + HLC** (`packages/sync`): HLC per peer, total order `(hlc, eventId)`. Fold through `packages/domain` with checkpoints every 200 events; out-of-order insertion triggers re-fold from the nearest checkpoint.
- **Version vectors** per author key to compute missing events on resync. Messages: `hello{vv}`, `need{ranges}`, `have{envelopes}`.
- **Relay** (`apps/relay`): forwarder with ring buffer (2,000 envelopes or 4 MB), per-socket attachment (2 KB) for role hints, no `ctx.storage`. On wake with empty buffer it broadcasts `need-state`; the first peer with the highest vector re-seeds.
- **IndexedDB adapter** behind `ReplicaStorePort` (stores ciphertext envelopes + wrapped keys); key wrapping uses a non-extractable device key.
- **Board file**: `{ format: "retro/1", roomId, salt, envelopes[] }` encrypted with HKDF info `rb/file/v1`.
- Alternatives: Yjs (rejected for now, see PLAN 5.6); DO SQLite storage of ciphertext (rejected by N2).
- Where it lives: HLC, VersionVector in `packages/sync`; fold orchestration in `application`; envelope types in `protocol`; adapters in apps.

Security and privacy note: the relay sees envelope counts and sizes; the in-memory buffer holds ciphertext only and disappears on eviction.

## Risks / Trade-offs

- [Divergent forks after network partitions] -> deterministic total order makes them converge; UI shows "syncing" until vectors match.
- [Malicious peer floods the log] -> per-key rate limits enforced in the fold (events beyond N/min ignored) and at the relay (per socket).
- [IndexedDB unavailable (private mode)] -> memory replica only, warning banner and board file prompt.

## Migration Plan

Deploy relay v2 alongside v1 routes for 24 h, then remove v1 and the SQLite migration class with a `deleted_classes` migration in wrangler config (to verify against Cloudflare docs before applying).
