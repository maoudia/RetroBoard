## ADDED Requirements

### Requirement: Short board links
Board links SHALL use the `/boards/` path and the compact encoding, and links in the previous format SHALL keep opening the board.

#### Scenario: Old link
- **WHEN** a participant opens a link shared last month
- **THEN** the board opens

### Requirement: Explained room words
The room words SHALL be shown with a short explanation of their purpose.

#### Scenario: Share panel
- **WHEN** a facilitator opens the share panel
- **THEN** the words are labelled as board words to read aloud

### Requirement: Join with a short code
The landing join field SHALL accept a link, a short board code or the room words, and a participant online on the board SHALL be able to let the person in; the key is sealed to the joiner and never seen by the relay.

#### Scenario: Join from the TV code
- **WHEN** Bob types the code shown on the presenter screen in the landing join field and Alice, online on the board, accepts
- **THEN** Bob's browser receives the sealed link and opens the board

#### Scenario: Nobody online
- **WHEN** Bob enters a valid code while nobody holding the board is online
- **THEN** the screen says that someone from the board must be online and suggests asking for the link
