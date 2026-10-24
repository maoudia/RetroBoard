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
