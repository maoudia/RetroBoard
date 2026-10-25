# Proposal

## Why

Board links are capability URLs today, and the server reads every note. The product promise is "we keep nothing and see nothing". End-to-end encryption with the key in the URL fragment is the only way to protect a board for free in a JAMstack architecture, and it is the precondition for the memory-only relay.

## What Changes

- New link format `/r/<roomId>#k=<roomKey>`; the key never reaches the server.
- All board events are encrypted and authenticated in the browser (AES-GCM 256, AAD bound to room, event id and clock).
- Optional passcode combined with the key (two-factor sharing: link + passcode).
- Facilitator capability key (Ed25519) in a separate facilitator link; privileged events must be signed.
- Per-participant session signing keys, so author-only edits hold without a server.
- ~~Turnstile challenge before a room is created~~ (dropped 2026-10-24, see design.md).
- **BREAKING**: old `/board#<id>` links stop working after migration (boards are ephemeral, so no data migration).

Out of scope: key rotation inside a running board, moderation tooling, sealed ballots (in `voting-v2-and-ranking`).

## Capabilities

### New Capabilities

- `room-access`: how a board is protected and joined (keys, passcode, facilitator capability, creation challenge).

### Modified Capabilities

None (the join requirement in `board-session` stays true at the behaviour level; the link format is defined here).

## Impact

- Bounded context: Access; packages `crypto`, `protocol`, `application` (Create/Join use cases); `apps/relay` admission.
- Relay sees only ciphertext from this change on.
- Free-plan budget: unchanged (same message count, slightly larger messages).
