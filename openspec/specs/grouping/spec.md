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
