# Proposal

## Why

Owner feedback (2026-10-25): when the vote is over, the actions panel should show what the team voted for, so actions come from the top ideas without switching screens. Owners should be picked from a list of the people connected right now.

## What Changes

- Actions panel, next to the actions carried over from previous retros: a "Voted ideas" section once voting is over (the Vote phase is past, or votes are revealed; never while a secret vote is open).
  - Notes and groups sorted by votes, most first (default); other sorts: column, newest, author.
  - Each row shows the votes, the column and "Create an action" (note-to-action prefill); rows that already have actions show the badge.
  - Ties keep the ranking rule (buildRanking).
- Owner dropdown everywhere in the actions panel: a fixed "Connected now" section at the top with every connected participant (names as shown, anonymous ones excluded), then names already used as owners on this board, then free text.
- The selected sort is remembered per browser (local preference).

Out of scope: weighting or dot-voting changes (voting-v2-and-ranking).

Bounded contexts: Actions (read model), Voting (ranking). No new relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `action-tracking`: voted ideas in the actions panel, connected owners list.

## Impact

- Application: `votedIdeas(snapshot, sort)` read model on top of `buildRanking`, `ownerChoices(snapshot, peers)`.
- Web: section in `ActionsDrawer`, sort control, `OwnerCombobox` with a fixed connected section.
- Depends on note-to-action (prefill and badge).
