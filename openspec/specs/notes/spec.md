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

### Requirement: Pinned ideas
A facilitator SHALL be able to pin a note or a cluster; pinned items SHALL be shown first in their column for every participant whatever their sort, marked as pinned, until unpinned.

#### Scenario: Pin under a personal sort
- **WHEN** the facilitator pins "Release is late" and Bob sorts the column by votes
- **THEN** Bob sees "Release is late" first with a pin badge, and the other ideas sorted by votes below it

#### Scenario: Pinned is not frozen
- **WHEN** a participant votes on a pinned note that is not frozen
- **THEN** the vote counts

### Requirement: Frozen notes
A facilitator SHALL be able to freeze a note or a cluster; a frozen item SHALL stay visible and SHALL refuse edits, votes, moves, grouping, colour changes and deletion until unfrozen.

#### Scenario: Vote on a frozen note
- **WHEN** Bob tries to vote on a frozen note
- **THEN** nothing changes and Bob sees that the note is frozen
