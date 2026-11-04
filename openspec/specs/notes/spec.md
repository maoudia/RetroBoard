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
A participant SHALL be able to recolour a whole cluster at once from the cluster panel (one command), which recolours every note of the cluster except the frozen ones.

#### Scenario: Recolour a cluster
- **WHEN** Alice picks blue for the cluster "Deploys"
- **THEN** every note of the cluster turns blue for everyone

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
