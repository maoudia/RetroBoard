## ADDED Requirements

### Requirement: Up and down votes
A board SHALL offer an optional "up and down" vote style, off by default; in that style each participant SHALL give at most one up or one down per idea and the ranking SHALL use ups minus downs.

#### Scenario: Default
- **WHEN** a facilitator creates a board without touching the vote style
- **THEN** votes use dots as today

#### Scenario: Change of mind
- **WHEN** Bob gives an up then a down to the same idea
- **THEN** only the down counts and the idea score goes from +1 to -1
