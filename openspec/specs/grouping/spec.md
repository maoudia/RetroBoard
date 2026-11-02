# grouping Specification

## Purpose
Stacking related notes into groups that can be opened, renamed, ungrouped and dissolved.

## Requirements

### Requirement: Group by dropping
The system SHALL create a group when a note is dropped onto another note of the same column.

#### Scenario: Stack two notes
- **WHEN** a participant drops note B onto note A
- **THEN** a stack of 2 notes is shown in place of A and B

### Requirement: Group panel
The system SHALL open a panel showing the group's notes, an editable title and a dissolve action when a stack is clicked.

#### Scenario: Rename a group
- **WHEN** a participant edits the group title
- **THEN** the new title is shown on the stack for everyone

### Requirement: Automatic dissolution
The system SHALL dissolve a group that has fewer than 2 notes.

#### Scenario: Ungroup one of two
- **WHEN** a note is removed from a group of 2
- **THEN** the group disappears and both notes are loose again

### Requirement: Cluster title
A cluster SHALL have a title that defaults to its shortest idea cut on a word boundary (at most 40 characters), SHALL be renameable by any participant during grouping, and SHALL offer at most three title suggestions derived from its ideas, preferring phrases shared by several ideas over isolated words.

#### Scenario: Default title
- **WHEN** note "Builds take 20 minutes on every push" receives note "Slow CI"
- **THEN** the cluster is titled "Slow CI" until someone renames it

#### Scenario: Shared phrase first
- **WHEN** a cluster holds "Slow pipeline", "The pipeline is slow on Fridays" and "Flaky tests"
- **THEN** the first suggestion is "Slow pipeline"

#### Scenario: Content words only
- **WHEN** a cluster holds "bug in CI" and "CI bug"
- **THEN** only the shortest idea "CI bug" is suggested (words shorter than 4 letters are never suggested alone), and "test" and "tests" count as the same word elsewhere

### Requirement: Cluster as an idea
A cluster SHALL be treated as one idea for voting, ranking and action creation.

#### Scenario: Action from a cluster
- **WHEN** the facilitator creates an action from the top-ranked cluster
- **THEN** the action references the cluster title

### Requirement: Expand all in a column
Each column SHALL offer "Expand all" and "Collapse all", switching every cluster in that column between a stacked view and an inline expanded view for the current participant.

#### Scenario: Expand all
- **WHEN** a participant clicks "Expand all" on a column with 3 clusters
- **THEN** the 3 clusters show their ideas inline in that participant's view only

### Requirement: Merge clusters
Dropping a cluster onto another cluster of the same column SHALL merge them, keeping the target's title.

#### Scenario: Merge
- **WHEN** a cluster of 2 is dropped on a cluster of 3
- **THEN** one cluster of 5 remains with the target's title

### Requirement: Automatic grouping
A facilitator SHALL be able to group notes by author or by similar ideas after a preview, and undo it.

#### Scenario: By author
- **WHEN** the facilitator applies group by author
- **THEN** each named author has one cluster and anonymous notes stay loose

### Requirement: Move a cluster to another column
A participant SHALL be able to move a whole cluster to another column by drag and drop or from the cluster menu; its ideas, votes and title SHALL move with it.

#### Scenario: Drag a cluster
- **WHEN** Alice drags the cluster "Slow CI" (3 ideas, 2 votes) from "Went wrong" to "To improve"
- **THEN** every participant sees the cluster in "To improve" with its 3 ideas, 2 votes and title

#### Scenario: Keyboard alternative
- **WHEN** a keyboard user opens the cluster menu and chooses "Move to column..." then "To improve"
- **THEN** the cluster moves as with drag and drop and the cluster panel closes

#### Scenario: Locked board
- **WHEN** the board is locked
- **THEN** the move is refused and the cluster stays in place for everyone
