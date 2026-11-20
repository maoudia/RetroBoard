## ADDED Requirements

### Requirement: Team and project in simple mode
Simple mode SHALL let a person choose a team (or create one) and give an optional project at creation, in one compact row; advanced mode SHALL show the same row with its longer explanation.

#### Scenario: Choose a project in simple mode
- **WHEN** a person in simple mode picks a team and types a project
- **THEN** the board is assigned to that team and project and the carry-over of the next retro can be filtered by it

#### Scenario: New team in simple mode
- **WHEN** a person in simple mode chooses "New team" and names it
- **THEN** the team is created locally and the board is assigned to it
