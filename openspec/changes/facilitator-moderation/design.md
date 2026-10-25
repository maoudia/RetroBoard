# Design

## Decisions

- **Removal** cannot stop someone who still has the room key from reading future events: the honest fix is key rotation. "Move to a fresh link" builds a new `KeyRing` (new room id, room key, facilitator seed), re-signs nothing (events keep their authors), re-seals the envelopes with the new content key under the new room, and sends a `room.moved` frame (encrypted with the old key, but carrying the new key only to participants not removed: sealed per participant with X25519 to their session keys, already exchanged in presence). Removed participants never get the new key.
- **Rename**: `participant.rename { key, name }` by the facilitator overrides the label shown for that session key on this board; the participant sees "renamed by the facilitator".
- **Reveal all**: `drafts.reveal { at }` (privileged) starts a countdown; each client publishes its drafts when `at` passes, skipping drafts flagged "keep private" locally. Drafts never leave a device before that, so the facilitator never sees them early.

Where things live: role events in `packages/domain/access`, room migration in `apps/web` transport with sealing in `packages/crypto`, reveal in application + web.

Security and privacy note: the relay sees a burst of envelopes during a move (same size as the board) and one `room.moved` frame per remaining participant; it never sees keys.
