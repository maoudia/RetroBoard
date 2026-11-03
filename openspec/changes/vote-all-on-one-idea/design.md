# Design

## Context
`maxVotesPerItem` already exists in domain settings. The option is a boolean that overrides it with the budget when on.

## Decisions
- Store as a board setting (`allVotesOnOne`, default false), changed only by facilitators, ignored by the fold when invalid.
- Interaction with up/down votes: net score per person per idea stays within the budget.
- Shown only in advanced mode (ui-modes parity).
