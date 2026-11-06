## ADDED Requirements

### Requirement: Owner suggestions
When assigning an owner, the system SHALL suggest connected participants first, then owners used in the team's previous actions, and SHALL offer the typed text as a custom owner as the last option.

#### Scenario: Owner not present
- **WHEN** the facilitator types "Carla" and Carla is not connected nor in the history
- **THEN** the last suggestion is "Use 'Carla'" and selecting it sets Carla as owner

### Requirement: Status modes
The system SHALL let the facilitator choose, per board, a checkbox status or a workflow status with To do, In progress, Done, Blocked and Dropped.

#### Scenario: Workflow mode
- **WHEN** the board uses workflow mode and an action moves from To do to Blocked
- **THEN** everyone sees the Blocked status and the action's status history keeps the change

### Requirement: Carry-over at creation
The system SHALL let the facilitator import previous actions when creating a board, from the local team profile, a board file, a JSON or CSV export, or a previous board link that is still reachable, and SHALL keep each action's previous status and owner.

#### Scenario: Import from team profile
- **WHEN** the facilitator creates "Team Atlas - Sprint 43" with "import open actions from Sprint 42"
- **THEN** the new board contains Sprint 42's actions that were not Done or Dropped, marked as carried over

### Requirement: Previous actions review
When a board contains carried-over actions, the system SHALL present them at the start of the retro in a review popup and in a dedicated section where statuses can be updated.

#### Scenario: Start of retro
- **WHEN** a participant joins a board with 4 carried-over actions
- **THEN** a review panel lists the 4 actions with their owners and quick status buttons

### Requirement: Team history
At the end of a retro the system SHALL offer the facilitator to save the board's actions into the local team profile for the next retro.

#### Scenario: Save history
- **WHEN** the facilitator closes the retro and accepts "save actions for next time"
- **THEN** the team profile on that device lists the actions with their final statuses
