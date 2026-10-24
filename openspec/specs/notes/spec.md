# notes Specification

## Purpose
Sticky notes: private drafts written in the browser, published to the shared board, edited, recoloured, moved and deleted.

## Requirements

### Requirement: Private drafts
The system SHALL keep notes written in a column's private section in the author's browser until they are published.

#### Scenario: Draft stays private
- **WHEN** a participant writes a draft and does not publish it
- **THEN** no other participant can see it

### Requirement: Publishing
The system SHALL publish one draft, all drafts of a column, or all drafts of the board in one action, and SHALL show the notes to every participant.

#### Scenario: Publish all
- **WHEN** a participant clicks "Publish all" with 3 drafts
- **THEN** the 3 notes appear in their columns for everyone and the drafts are removed

### Requirement: Author-only edits
The system MUST only allow the author of a note to edit its text or delete it.

#### Scenario: Someone else tries to delete
- **WHEN** a participant who is not the author sends a delete for a note
- **THEN** the note is kept and the sender receives a "forbidden" error

### Requirement: Colour and move
The system SHALL let any participant change a note's colour among the theme's 8 note colours and move it to another column.

#### Scenario: Move by drag and drop
- **WHEN** a participant drops a note on another column
- **THEN** the note moves to that column for everyone
