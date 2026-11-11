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

### Requirement: Composer at the top of the column
The system SHALL place each column's composer at the top of the column, under its title and above the published notes, and SHALL label it in words as visible to its author only until published. The author's drafts SHALL hang in a tray under the composer, each shown as a tilted note with a "draft" ribbon.

#### Scenario: Composer and tray
- **WHEN** a participant opens a board and keeps two ideas as drafts in a column
- **THEN** the composer sits above the column's published notes with the label "Only you see this until you publish"
- **AND** the two drafts appear under it as tilted notes, each with a "draft" ribbon

### Requirement: Phone composer sheet
On a phone-width screen the system SHALL offer one write button in the thumb zone, above the column tab bar, that opens the composer as a bottom sheet with one chip per visible column. The chip chosen SHALL decide the column the notes go to, the column in view SHALL be the default, and the sheet SHALL close on Escape, on a tap beside it and after "Publish now". The column SHALL keep the drafts tray.

#### Scenario: Pick the column with a chip
- **WHEN** a participant at 360 px taps the write button, taps the chip of the third column, types an idea and adds it
- **THEN** the idea is a draft of the third column, the chip shows one draft, and the sheet stays open for the next idea
