## ADDED Requirements

### Requirement: Board options follow the interface mode
The board options dialog SHALL show the essentials in simple mode and every setting in advanced mode, without removing any setting.

#### Scenario: Simple options
- **WHEN** Alice opens the options in simple mode
- **THEN** she sees votes per person and secret voting, and not the talk time budget
- **AND WHEN** she switches to advanced
- **THEN** the talk time budget appears
