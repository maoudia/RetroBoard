# action-tracking Specification

## Purpose
The action plan decided during the retro: actions with an optional owner and a done state.

## Requirements

### Requirement: Action plan
The system SHALL let participants add actions with an optional owner, mark them done and delete them.

#### Scenario: Add an action
- **WHEN** a participant adds "Fix flaky test" owned by "Alice"
- **THEN** every participant sees the action with its owner

### Requirement: Voted ideas in the actions panel
Once voting is over, the actions panel SHALL list the board's notes and groups sorted by votes (most first by default), with sorts by column, newest and author, and a "Create an action" button on each row, next to the actions carried over from previous retros.

#### Scenario: After the vote
- **WHEN** the Vote phase has ended and Alice opens the actions panel
- **THEN** she sees the carried-over actions and the voted ideas, the most voted first

#### Scenario: Secret vote open
- **WHEN** a secret vote is still open
- **THEN** the voted ideas section is not shown

#### Scenario: Sort by column
- **WHEN** Alice picks the "Column" sort
- **THEN** ideas are grouped by column, most voted first in each

### Requirement: Connected owners first
Every owner dropdown in the actions panel SHALL start with a fixed "Connected now" section listing the connected participants whose names are shown, followed by owners already used on the board and free text.

#### Scenario: Pick a connected owner
- **WHEN** Alice opens the owner dropdown while Bob and Carol are connected
- **THEN** Bob and Carol appear at the top under "Connected now"

### Requirement: Action from a note
A note or group menu SHALL offer "Create an action", which opens the actions panel with a form filled with the note text, the note's shown author as owner, and an owner dropdown to change it; the action SHALL keep a link to its source note.

#### Scenario: Named author
- **WHEN** Alice chooses "Create an action" on Bob's note "Release notes are late"
- **THEN** the actions panel opens with text "Release notes are late" and owner Bob, and Alice can pick another owner before adding

#### Scenario: Anonymous note
- **WHEN** a participant creates an action from an anonymous note
- **THEN** the owner field is empty

#### Scenario: Phase does not allow actions
- **WHEN** the agenda runs with rules in the Write phase
- **THEN** "Create an action" is disabled with the reason

### Requirement: Multi-line action text
The action plan dialog SHALL offer a multi-line writing area for the action text that grows with its content and saves with Ctrl or Cmd plus Enter.

#### Scenario: Write a long action
- **WHEN** a user types three lines in the action text
- **THEN** all three lines stay visible and are saved with the action

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
