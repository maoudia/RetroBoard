# Design

## Context
`maxVotesPerItem` already exists in domain settings. The option is a boolean that overrides it with the budget when on.

## Decisions
- No new setting (decision at implementation): the toggle sets `maxVotesPerItem` to the vote budget (and keeps it equal when the budget changes); off sets it back to 1. Default stays off. Facilitator-only through the existing `settings.update` rules.
- Interaction with up/down votes: net score per person per idea stays within the budget.
- Shown only in advanced mode (ui-modes parity).
