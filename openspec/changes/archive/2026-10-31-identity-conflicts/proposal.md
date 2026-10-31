# Proposal

## Why

Owner feedback (2026-10-29): when two participants use the same name, people cannot tell them apart; the latest one to join should be asked to change name and avatar.

## What Changes

- When a participant joins with a name already used by someone present (case and accents ignored), a dismissible popup asks them to pick another name or avatar, with suggestions.
- Meanwhile the participants menu shows a disambiguator (avatar colour or initial).

Out of scope: the propagation of a renamed profile to earlier notes (bug issue).

Bounded contexts: Profile (local), Presence. No relay traffic change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `profile`

## Impact

- Application: nameConflict rule; web: popup in the shared queue and disambiguator.
