# Proposal

## Why

Owner feedback (2026-10-29): voting should be possible on some columns only. By default it is on the columns where the team can improve things, not the happy ones; the facilitator can change it at creation.

## What Changes

- Per-column "votable" flag; templates mark improvement columns (for example Stop, Less, Problems) as votable by default.
- Creation form and column settings let the facilitator change it.
- Vote buttons are hidden on non-votable columns; ranking and charts only include votable columns.

Out of scope: voting rules per participant.

Bounded contexts: Voting, Retro templates. No relay traffic change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voting`
- `retro-templates`

## Impact

- Domain: column votable flag and vote guard; catalogue defaults; web toggles; read models.
