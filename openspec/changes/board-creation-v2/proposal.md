# Proposal

## Why

The creation page must expose the decisions that shape a retro: team and sprint (smart title), agenda, vote settings, maximum participants, action status mode, carry-over and passcode. Today it only asks for title, theme and format.

## What Changes

- Creation becomes a short stepper: Team and title, Format and agenda, Voting, Actions, Access, Review.
- Smart title `<Team> - Sprint <N> - <date>` from the local team profile; sprint counter incremented.
- Vote settings (votes per person, max per item, votable items, hidden counts or sealed ballot).
- Max participants (capped by the facilitator's plan).
- Status mode and carry-over import.
- Passcode and talk time settings.
- "Quick start" button keeps a one-click path with team defaults.

Out of scope: the underlying features (owned by their changes); this change composes them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`: creation options and participant cap.

## Impact

- Web creation page, team profile, entitlements (cap).
