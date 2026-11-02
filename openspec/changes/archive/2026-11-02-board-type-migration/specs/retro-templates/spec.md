## ADDED Requirements

### Requirement: Change the format and keep the notes
A facilitator SHALL be able to switch the board to another format while keeping every note, cluster and vote, mapped by column position, with the columns beyond the new count merged into the last new column.

#### Scenario: Fewer columns
- **WHEN** a board with columns A, B, C, D (notes in each) switches to a format with columns X, Y, Z and keeps the notes
- **THEN** the notes of A go to X, B to Y, and C then D go to Z, and no note is lost

#### Scenario: More columns
- **WHEN** a board with 2 columns switches to a format with 4 columns and keeps the notes
- **THEN** the notes stay in the first two new columns and the last two start empty

#### Scenario: Clusters stay whole
- **WHEN** a cluster of 3 ideas with 2 votes sits in a migrated column
- **THEN** it appears in the target column with its 3 ideas, 2 votes and title

#### Scenario: Preview before applying
- **WHEN** the facilitator chooses "Change and keep notes"
- **THEN** the dialog lists where each current column goes before confirming

#### Scenario: Clear still available
- **WHEN** the facilitator chooses "Replace and clear"
- **THEN** the behaviour is unchanged: notes and clusters are deleted for everyone, actions are kept
