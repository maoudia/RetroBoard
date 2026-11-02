## ADDED Requirements

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
