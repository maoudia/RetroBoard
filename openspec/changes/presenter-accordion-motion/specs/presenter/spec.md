## ADDED Requirements

### Requirement: Accordion animation
In accordion presenter style, changing the focused column SHALL animate the previous column folding and the next one unfolding, unless reduced motion is on.

#### Scenario: Next column
- **WHEN** the facilitator presses the right arrow in accordion style
- **THEN** the current column folds to a spine and the next one unfolds in under 500 ms
