## ADDED Requirements

### Requirement: Facilitation choice at creation
The board setup SHALL offer "Everyone facilitates" (selected by default) and "One facilitator", and the board options SHALL let a facilitator capability holder switch later.

#### Scenario: Default creation
- **WHEN** a person creates a board without touching the facilitation choice
- **THEN** the board is created with "Everyone facilitates"

#### Scenario: Switch later
- **WHEN** the creator switches an open board to "One facilitator" from the options
- **THEN** the creator becomes the lead facilitator and other participants lose the facilitation controls
