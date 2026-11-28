# notes Specification

## Purpose
Sticky notes: private drafts written in the browser, published to the shared board, edited, recoloured, moved and deleted.

## Requirements

### Requirement: Private drafts
The system SHALL keep notes written in a column's private section in the author's browser until they are published, sealed with a key that cannot be exported from that browser, and SHALL delete them with the local copy of their board.

#### Scenario: Draft stays private
- **WHEN** a participant writes a draft and does not publish it
- **THEN** no other participant can see it

#### Scenario: Draft at rest
- **WHEN** the browser storage is read outside the application
- **THEN** the text of a draft does not appear in it

#### Scenario: Retention
- **WHEN** the local copy of a board is deleted at the end of its retention
- **THEN** the drafts and typed text of that board are deleted too

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

### Requirement: Draft-first composer
The composer SHALL present "Add" (to my drafts) as its primary action, placed last in reading order, and "Publish now" as a secondary action placed before it.

#### Scenario: Write several ideas
- **WHEN** a participant types an idea and clicks the primary button
- **THEN** the idea becomes a private draft, the field is cleared for the next one, and nobody else sees it

#### Scenario: Order on a phone
- **WHEN** the composer is shown at 360 px wide
- **THEN** "Publish now" comes first and "Add" last, and both stay at least 24 px high

### Requirement: Signature in the composer
The composer SHALL show whether the next notes will be signed with the participant's name or published anonymously, and SHALL let the participant switch between the two in one action before publishing.

#### Scenario: Switch to anonymous
- **WHEN** Alice, signed as "Alice", clicks the signature chip and publishes a note
- **THEN** the note is anonymous for everyone, and the chip now reads "Anonymous"

#### Scenario: No name yet
- **WHEN** a participant has no name
- **THEN** the chip reads "Anonymous" and clicking it opens the name dialog

#### Scenario: Published notes unchanged
- **WHEN** a participant switches the chip after publishing notes
- **THEN** the notes already published keep their author display

### Requirement: Closed composer outside writing phases
When the running agenda's current phase does not allow publishing notes for a participant, the composer SHALL be shown disabled with a lock icon, the reason, and the next phase that allows writing when there is one.

#### Scenario: Vote phase
- **WHEN** the agenda runs with rules and the Vote phase is current
- **THEN** each composer is greyed out with "Writing is closed during Vote" and its publish buttons are disabled

#### Scenario: Facilitator
- **WHEN** a facilitator capability holder looks at the same composer
- **THEN** it is enabled with the hint "Allowed for you as facilitator"

#### Scenario: No running agenda
- **WHEN** no agenda runs or phase rules are off
- **THEN** the composer is enabled as today

### Requirement: Sticky-note palette
The system SHALL offer 8 sticky-note colours familiar from paper notes, readable in the light and dark variant of every theme, and SHALL give each column a default colour used by its new notes.

#### Scenario: New note in a column
- **WHEN** a participant writes a note in a column whose default colour is pink
- **THEN** the draft and the published note are pink unless the author picks another colour

### Requirement: Recolour during the retro
The system SHALL let a participant change a note's colour at any time from a quick row of swatches on the note and from a full palette.

#### Scenario: Quick recolour
- **WHEN** a participant hovers a note and picks the blue swatch
- **THEN** the note turns blue for everyone

### Requirement: Composer actions
The composer SHALL offer "Add" and "Publish now" buttons, SHALL keep the text while the participant switches fields, and SHALL not require the Enter key.

#### Scenario: Phone
- **WHEN** a participant on a phone types an idea and taps "Publish now"
- **THEN** the idea is published without pressing Enter

### Requirement: Note length limit
The facilitator SHALL be able to set the maximum length of a note between 40 and 500 characters, and every note editor SHALL show a live character counter against that limit.

#### Scenario: Limit reached
- **WHEN** the limit is 100 and a participant has typed 100 characters
- **THEN** the counter shows "100 / 100" in the warning colour and no more characters can be typed

#### Scenario: Peer ignores the limit
- **WHEN** a modified client publishes a 300-character note on a board limited to 100
- **THEN** every participant ignores that note

### Requirement: Hover actions
On pointer devices the system SHALL reveal validate and dismiss actions when hovering or focusing a draft or a note being edited; on touch devices the same actions SHALL be in the note's menu.

#### Scenario: Dismiss a draft
- **WHEN** a participant hovers a draft and clicks the dismiss icon
- **THEN** the draft is deleted

### Requirement: Action badge
A note or group that is the source of actions SHALL show how many actions came from it, and the badge SHALL open those actions.

#### Scenario: Badge
- **WHEN** an action is added from a note
- **THEN** every participant sees "1 action" on that note

### Requirement: Edit a published note
The author of a published note and the facilitators SHALL be able to change its text; other participants SHALL NOT.

#### Scenario: Facilitator fixes a typo
- **WHEN** the facilitator edits Bob's published note
- **THEN** everyone sees the new text with an edited mark and Bob's votes stay

### Requirement: Colour while writing
The composer SHALL let the author pick the note colour before publishing, and the published note SHALL keep it.

#### Scenario: Pick a colour
- **WHEN** Alice picks the green swatch in the composer and publishes
- **THEN** the note appears green for everyone

### Requirement: Default note length
A new board SHALL accept notes of up to 160 characters unless the facilitator changes the setting; existing boards SHALL keep their limit.

#### Scenario: New board
- **WHEN** a facilitator creates a board without touching the note length
- **THEN** notes are limited to 160 characters

### Requirement: Advanced palette with coherent colours
The palette SHALL offer an advanced mode with more colours that all come from curated sets derived from the board theme; it SHALL NOT offer a free colour, and every offered colour SHALL keep a text contrast of at least 4.5:1 with the note ink.

#### Scenario: More shades
- **WHEN** Alice opens the advanced palette on a note
- **THEN** she sees extra shades and harmonies of the theme colours, and no free colour picker

### Requirement: Cluster colour
A participant SHALL be able to recolour a whole cluster at once from the group menu on the stack and from the cluster panel, with the same quick swatches and the same full palette (including the extended shades) as a note, in one command, which recolours every note of the cluster except the frozen ones.

#### Scenario: Recolour a cluster
- **WHEN** Alice picks blue for the cluster "Deploys"
- **THEN** every note of the cluster turns blue for everyone

#### Scenario: Extended shades for a cluster
- **WHEN** Alice opens the palette for a cluster and chooses more shades
- **THEN** she sees the same 24 theme shades as for a note, and choosing one recolours the notes of the cluster

#### Scenario: Cluster already in an extended shade
- **WHEN** Alice opens the palette of a cluster whose notes are in an extended shade
- **THEN** the palette opens with more shades shown and the current shade checked

#### Scenario: Frozen notes keep their colour
- **WHEN** a cluster contains a frozen note and Alice recolours the cluster
- **THEN** the frozen note keeps its colour and the other notes change

### Requirement: Compact composer
The composer SHALL show the character counter only from 80% of the note length, SHALL keep its hint to one short line with the keyboard tips in a help popover, and SHALL offer the signature as two named toggles (my name, anonymous).

#### Scenario: Counter appears late
- **WHEN** a participant types 30 characters in a 160-character composer
- **THEN** no counter is shown, and from 128 characters it reads "128 / 160"

#### Scenario: Signature toggles
- **WHEN** Alice presses the anonymous toggle
- **THEN** the anonymous toggle is pressed, the next notes are anonymous and earlier notes keep their author display

### Requirement: No palette on hover
A published note SHALL NOT show a colour palette on hover; its colour stays in the note menu and the palette sheet.

#### Scenario: Hover
- **WHEN** a pointer rests on a published note
- **THEN** no colour swatches appear

### Requirement: Keyboard stays open when stacking
Adding an idea on a phone SHALL keep the keyboard open.

#### Scenario: Stack several ideas
- **WHEN** a user sends an idea
- **THEN** the field keeps focus

### Requirement: Full-width columns and column colour
Columns SHALL use the available width, and a facilitator SHALL be able to colour a whole column and remove a single idea.

#### Scenario: Remove an idea
- **WHEN** a facilitator confirms removal of an idea
- **THEN** only that idea is removed

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
