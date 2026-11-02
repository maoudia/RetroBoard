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
