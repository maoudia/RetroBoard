## MODIFIED Requirements

### Requirement: Edit a published note
The author of a published note and the facilitators SHALL be able to change its text and colour from the writing zone of its column, by dragging the note onto the writing zone or by choosing "Edit" in its 3-dot menu; other participants SHALL NOT. The note SHALL stay published, with its votes and its cluster, until the change is saved, and a cancelled edit SHALL leave no trace.

#### Scenario: Facilitator fixes a typo
- **WHEN** the facilitator edits Bob's published note in the composer and saves
- **THEN** everyone sees the new text with an edited mark and Bob's votes stay

#### Scenario: Drag back into the writing zone
- **WHEN** the author drags a published note onto the writing zone of its column
- **THEN** the composer opens in edit mode with the note's text and colour, the note stays on the board, and "Save" and "Cancel" replace the publish buttons

#### Scenario: Cancel
- **WHEN** the author cancels an edit
- **THEN** the note is unchanged for everyone and the composer returns to a new draft

#### Scenario: Someone else's note
- **WHEN** a participant who is neither the author nor a facilitator opens the 3-dot menu of a note
- **THEN** the menu has no "Edit" and no "Back to my drafts" item, and dropping that note on a writing zone does nothing

#### Scenario: Frozen or locked
- **WHEN** a note is frozen, or the board is locked and the person is not a facilitator
- **THEN** "Edit" is disabled with the reason as its tooltip

#### Scenario: Being edited
- **WHEN** someone opens a note in the composer
- **THEN** the other participants see a light "being edited" mark on it, which disappears on save, cancel or disconnection, and no board event is sent for it

## ADDED Requirements

### Requirement: Unpublish an idea
The author of a published note and the facilitators SHALL be able to send it back to the private draft stack of its author, with the "Back to my drafts" item of the 3-dot menu or by dropping the note on the draft stack of the writing zone. The idea SHALL leave the shared board for everyone and SHALL reappear, with its text and colour, at the top of its author's draft stack in the column it came from.

#### Scenario: Author takes an idea back
- **WHEN** Alice unpublishes her idea "Slow CI" in the Stop column
- **THEN** the idea disappears from every participant's board and "Slow CI" is the first draft in Alice's Stop writing zone, unpublished and editable

#### Scenario: Facilitator sends someone's idea back
- **WHEN** the facilitator unpublishes Bob's idea
- **THEN** the idea leaves the board for everyone, it appears in Bob's draft stack (not the facilitator's), and Bob is told with a notice that names the facilitator

#### Scenario: The author is offline
- **WHEN** a facilitator unpublishes the idea of a participant who has left
- **THEN** the idea leaves the board, and the participant finds it in their draft stack the next time they open the board, exactly once

#### Scenario: Votes and cluster
- **WHEN** an idea with 2 votes in a cluster of 2 is unpublished
- **THEN** a confirmation states that 2 votes will be removed, the idea leaves, its votes go with it and the cluster dissolves

#### Scenario: Results are shown
- **WHEN** voting is closed and the idea has votes
- **THEN** "Back to my drafts" is disabled with "Voting is closed", and an idea without votes can still be unpublished

#### Scenario: Frozen, locked or not allowed
- **WHEN** the idea is frozen, or the board is locked, or the sender is neither the author nor a facilitator
- **THEN** every peer ignores the command, the board is unchanged and the sender sees the refusal

#### Scenario: Pinned idea
- **WHEN** a pinned idea is unpublished
- **THEN** the same confirmation as for a delete is asked and the pin is gone with the idea

### Requirement: Moving an idea to the writing zone is available without dragging
Every drag to the writing zone or to the draft stack SHALL have a menu and keyboard equivalent, and the drop targets SHALL be announced.

#### Scenario: Keyboard user
- **WHEN** a keyboard user focuses a note and opens its menu
- **THEN** "Edit" and "Back to my drafts" are reachable with the arrow keys and Enter, and the result is announced in the live region

#### Scenario: Drop target hint
- **WHEN** a note is being dragged over a writing zone
- **THEN** the zone shows "Edit here" and the draft stack shows "Back to my drafts", and reduced motion removes the highlight animation but keeps the labels

### Requirement: Unpublish motion
The unpublished idea SHALL fly into the draft stack, and SHALL not animate under reduced motion.

#### Scenario: Reduced motion
- **WHEN** the person prefers reduced motion
- **THEN** the idea leaves the board and appears in the stack at once, with the live-region announcement
