## ADDED Requirements

### Requirement: Clear draft state
The system SHALL show drafts with a distinct "draft" appearance and the label "Only you see this" until they are published, and SHALL show the number of unpublished drafts in the toolbar.

#### Scenario: Draft counter
- **WHEN** a participant has 3 drafts in two columns
- **THEN** the toolbar shows 3 unpublished drafts and a "Publish all" action

### Requirement: Undo publish
The system SHALL let the author undo a publication within 10 seconds, removing the note for everyone and returning it to drafts.

#### Scenario: Wrong column
- **WHEN** a participant publishes a note and clicks Undo within 10 seconds
- **THEN** the note disappears from the board for everyone and is back in the author's drafts

### Requirement: Keyboard publishing
The composer SHALL save a draft on Enter, insert a new line on Shift+Enter, publish on Cmd+Enter or Ctrl+Enter, and cancel on Escape.

#### Scenario: Publish with keyboard
- **WHEN** a participant types an idea and presses Ctrl+Enter
- **THEN** the idea is published directly

### Requirement: Leave guard
The system SHALL warn a participant who closes or leaves the board with unpublished drafts.

#### Scenario: Closing the tab
- **WHEN** a participant with 2 drafts closes the tab
- **THEN** the browser shows a leave confirmation
