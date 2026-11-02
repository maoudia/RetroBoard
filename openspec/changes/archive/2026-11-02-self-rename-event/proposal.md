# Proposal

## Why

Bug #229 (owner, 2026-10-29): a participant who renames their profile during a board keeps the old name on the notes already published. Signed notes should show the new name for everyone; anonymous notes stay anonymous.

## What Changes

- **Self rename event.** A signed `participant.self` event (name only, author = the participant's own key) is appended to the replicated ledger when the profile name changes. The ledger folds it into `selfNames`; a facilitator `participant.rename` still wins over it.
- **Display.** The snapshot merges ledger names (facilitator rename, then self rename, then the name carried by each note command) so signed notes show the latest name.
- Anonymous notes never carry a name, so they are unaffected.

## Out of scope

- Duplicate names (`identity-conflicts`).
- Changing the signature choice of published notes.

## Bounded contexts

- Access (ledger), Profile (local).

Relay traffic: one small encrypted event per rename. No server storage.

## Capabilities

### Modified Capabilities

- `profile`: a rename reaches earlier signed notes.

## Impact

- Domain `access/ledger.ts`, protocol `envelope.ts`, web `transport/encrypted.ts`.
