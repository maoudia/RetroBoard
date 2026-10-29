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
