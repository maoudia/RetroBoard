# Design

## Decisions

- **Removal** cannot stop someone who still has the room key from reading future events: the honest fix is key rotation. "Move to a fresh link" builds a new `KeyRing` (new room id, room key, facilitator seed), re-signs nothing (events keep their authors), re-seals the envelopes with the new content key under the new room, and sends a `room.moved` frame (encrypted with the old key, but carrying the new key only to participants not removed: sealed per participant with X25519 to their session keys, already exchanged in presence). Removed participants never get the new key.
- **Rename**: `participant.rename { key, name }` by the facilitator overrides the label shown for that session key on this board; the participant sees "renamed by the facilitator".
- **Reveal all**: `drafts.reveal { at }` (privileged) starts a countdown; each client publishes its drafts when `at` passes, skipping drafts flagged "keep private" locally. Drafts never leave a device before that, so the facilitator never sees them early.

Where things live: role events in `packages/domain/access`, room migration in `apps/web` transport with sealing in `packages/crypto`, reveal in application + web.

Security and privacy note: the relay sees a burst of envelopes during a move (same size as the board) and one `room.moved` frame per remaining participant; it never sees keys.

## Open questions

- **Blocks 2.1 (found 2026-11-06).** Event signatures are bound to the room id (`signedMessage(roomId, ...)` in `packages/application/src/events/signed.ts`, domain separation). The decision above ("re-signs nothing, re-seals the envelopes under the new room") therefore does not hold: a copied event fails verification in the new room. The genesis also carries the old room id, and carried events sort before any new genesis. Options, to settle in an ADR before any code:
  1. Carry events with their original signatures and verify them against the `movedFrom` room id announced by the new genesis (keeps authors and votes; changes the verification rule and the genesis shape, so it touches the replicated fold).
  2. The facilitator re-signs a snapshot as fresh commands in the new room (no change to verification; authors, votes and "only the author edits" are lost for carried content).
  Keeping the same facilitator seed in the new ring is enough for removal (a removed participant never held it), which also avoids re-keying the facilitator.
- The sealing primitive already exists (`sealTo` / `openFrom` in `packages/crypto/src/primitives.ts`); what is missing is an X25519 key in presence (it only carries the Ed25519 session key).
