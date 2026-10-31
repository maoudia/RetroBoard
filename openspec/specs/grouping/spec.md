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
A cluster SHALL have a title that defaults to the text of its first idea, SHALL be renameable by any participant during grouping, and SHALL offer title suggestions derived from its ideas.

#### Scenario: Default title
- **WHEN** note "Slow CI" receives note "Builds take 20 min"
- **THEN** the cluster is titled "Slow CI" until someone renames it

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
