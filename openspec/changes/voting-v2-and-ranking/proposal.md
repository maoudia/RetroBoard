# Proposal

## Why

Voting must be accurate and visible, configurable at creation, possible on clusters, and not influence people. After voting, teams want a clear ranking (podium) to decide actions.

## What Changes

- Vote policy: votes per person, max votes per item, votable items (notes, clusters), hidden counts during voting, sealed (secret) ballot.
- Clear vote UI: remaining votes in the toolbar, my votes as dots on items, undo, feedback animation.
- Facilitator closes voting; tally revealed to everyone.
- Ranking page with podium (top 3), full ordered list with ties, and "create action" from any item.

Out of scope: weighted or ranked-choice voting (future idea).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `voting`: adds policy, cluster votes, hidden counts, sealed ballot, closing and ranking.

## Impact

- Context: Voting. X25519 sealing from `packages/crypto`.
- Free-plan budget: one event per vote.
