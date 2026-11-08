## ADDED Requirements

### Requirement: Unpublish is undoable and listed
The undo, redo and history panel SHALL treat "sent back to drafts" like a delete of the idea: it SHALL be undoable by its sender, listed with its author and the idea's text, and restorable by a facilitator.

#### Scenario: Undo
- **WHEN** a participant unpublishes an idea and presses undo
- **THEN** the idea returns to the board as a new idea with the same text, colour and column, and its draft leaves the stack

#### Scenario: History entry
- **WHEN** a facilitator opens the history after an unpublish
- **THEN** the entry reads "sent back to drafts" with the idea's text, and restoring from before it brings the idea back as a new one
