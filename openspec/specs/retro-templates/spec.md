# retro-templates Specification

## Purpose
Ready-made retro formats and a wizard that suggests one from goal, mood, time and season.

## Requirements

### Requirement: Format catalogue
The system SHALL offer at least 13 retro formats, each with a name, a description and its columns.

#### Scenario: Apply a format
- **WHEN** the facilitator applies a format to a board with notes and confirms
- **THEN** the columns are replaced and the notes are cleared

### Requirement: Suggestions
The system SHALL rank formats from a goal, a team mood (1-5), an available time and the board theme, and SHALL explain each suggestion.

#### Scenario: Quick format
- **WHEN** the goal is "go fast" and the time is 15 minutes
- **THEN** the top suggestion fits in 15 minutes

### Requirement: Default votable columns
Every template SHALL mark its improvement columns as votable by default.

#### Scenario: Start Stop Continue
- **WHEN** a board is created from Start Stop Continue
- **THEN** Stop and Start are votable and Continue is not

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
