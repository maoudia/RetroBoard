# columns Specification

## Purpose
Board columns that can be added, renamed, given an icon, reordered and deleted.

## Requirements

### Requirement: Column management
The system SHALL let participants add (up to 8), rename, change the icon of, reorder and delete columns, keeping at least one column.

#### Scenario: Delete a column with notes
- **WHEN** a participant confirms deleting a column with 2 notes
- **THEN** the column and its notes disappear for everyone

#### Scenario: Last column
- **WHEN** only one column remains
- **THEN** its delete action is disabled

### Requirement: Sorting options
A participant SHALL be able to sort a column by votes, date, author, colour, cluster size or text, for themselves only.

#### Scenario: Newest first
- **WHEN** Bob sorts a column by newest
- **THEN** Bob sees the latest notes first and Alice keeps her order

### Requirement: Column size
A participant SHALL be able to resize a column with predefined sizes, the mouse or the keyboard, and the size SHALL be remembered on that board.

#### Scenario: Wide column
- **WHEN** Bob makes the Stop column wide and reloads
- **THEN** the column is still wide

### Requirement: Hide a column for everyone
A facilitator SHALL be able to hide a column and show it again; a hidden column SHALL disappear for every participant while its notes, votes and actions are kept, and SHALL be listed as hidden.

#### Scenario: Hide during the discussion
- **WHEN** the facilitator hides the Kudos column
- **THEN** no participant sees the column, the board says one column is hidden, and showing it again restores it with its notes and votes

#### Scenario: Participant
- **WHEN** a participant opens a column menu
- **THEN** there is no Hide entry
