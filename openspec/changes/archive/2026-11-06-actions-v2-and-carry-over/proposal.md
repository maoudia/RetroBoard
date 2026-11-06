# Proposal

## Why

Actions are what a retro produces, and the next retro must start by checking them. Today actions have a free-text owner and a done checkbox, and nothing carries over between retros.

## What Changes

- Owner picker: connected participants first, then names from the team history, then "Use '<typed text>'" at the end.
- Status mode chosen per board: checkbox, or workflow (To do, In progress, Done, Blocked, Dropped).
- Optional due date and link to the originating idea or cluster.
- Carry-over: previous actions imported at creation (from the local team profile, a board file, a JSON/CSV export, or a previous board link still alive).
- "Previous actions" review: a popup at the start of the retro and a dedicated section, to update statuses first.
- Team history of actions saved locally in the facilitator's team profile at the end of the retro.

Out of scope: syncing with Jira (export only, see `export-hub`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `action-tracking`: owner suggestions, status workflows, due dates, carry-over and review.

## Impact

- Contexts: Action tracking, Team space (local), Facilitation (review phase).
