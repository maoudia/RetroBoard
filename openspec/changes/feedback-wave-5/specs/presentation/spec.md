## ADDED Requirements

### Requirement: Presenter space
In presenter mode the focused column SHALL use wide notes, and an idea longer than 110 characters SHALL take the whole row and wrap in a readable line length.

#### Scenario: Long idea on a wide screen
- **WHEN** a long idea is shown in the focused column
- **THEN** it spans the row instead of a narrow strip

### Requirement: Walk-through keeps the board visible
The voted-ideas walk-through SHALL NOT dim or hide the board: the idea in turn is ringed in place and shown in a dock, and a control SHALL return to the most voted idea.

#### Scenario: Step through the ranking
- **WHEN** the presenter starts the walk-through
- **THEN** the first idea is ringed on the board and the other ideas stay visible
