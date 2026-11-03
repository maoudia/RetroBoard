# Proposal

## Why
A wrong grouping or deletion during a live retro is stressful. Owner feedback 2026-11-03: keep the last states so the team can rewind.

## What Changes
- Undo and redo of the latest reversible board actions (group, ungroup, move, delete, rename, colour) as compensating events appended to the signed ledger (history is never rewritten).
- A history panel listing recent actions with author and time, with "Restore this state" for facilitators.
- Rewind to a point creates a new event that restores the state; other peers converge deterministically.
- Participants can undo only their own actions; facilitators any action.

## Capabilities
### New Capabilities
- `board-history`: undo, redo and rewind via compensating events.
### Modified Capabilities
<!-- none -->

## Impact
Domain commands (inverse events), read model of history, UI panel and Ctrl+Z; keyboard shortcuts doc. Ledger stays append-only, encrypted, no server storage. Spec only for now.
