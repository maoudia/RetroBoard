## ADDED Requirements

### Requirement: Edit your own chat message
The author of a chat message SHALL be able to edit its text, every participant SHALL see the new text with an "edited" mark, and nobody else, facilitators included, SHALL be able to edit it.

#### Scenario: Fix a typo
- **WHEN** Alice edits her message 'Five more minuts?' to 'Five more minutes?'
- **THEN** every participant sees the corrected text with an "edited" mark

#### Scenario: Not your message
- **WHEN** a facilitator tries to edit a message written by Bob
- **THEN** the message is unchanged for everyone

#### Scenario: Same text
- **WHEN** Alice saves an edit that leaves the text as it was
- **THEN** no "edited" mark appears

### Requirement: Delete your own chat message
The author of a chat message SHALL be able to delete it; it SHALL be replaced for everyone by a neutral tombstone that holds neither its text nor its author.

#### Scenario: Take a message back
- **WHEN** Alice deletes her message
- **THEN** every participant sees 'Message removed' where it was, and no copy of the text remains in any replica state

### Requirement: Facilitators moderate the chat
A facilitator or co-facilitator SHALL be able to delete any message, shown as 'Message removed by a facilitator', and to clear the whole chat after a confirmation that states how many messages will be removed; participants SHALL NOT be able to delete the messages of others.

#### Scenario: Remove one line
- **WHEN** a facilitator deletes one message of Bob
- **THEN** that message becomes 'Message removed by a facilitator' for everyone and the others are unchanged

#### Scenario: Clear all
- **WHEN** a facilitator confirms 'Remove all 12 messages for everyone?'
- **THEN** the chat is empty for every participant, tombstones included

#### Scenario: A participant cannot moderate
- **WHEN** a participant tries to delete a message of another participant
- **THEN** the message is unchanged for everyone

### Requirement: Same result on every replica
Edits and deletions SHALL be signed board events folded in the order of the log, so that every participant, including a late joiner and a participant who receives events out of order, ends with the same chat; an edit or a deletion of an unknown, trimmed, cleared or already removed message SHALL change nothing.

#### Scenario: Out of order
- **WHEN** Carol receives Alice's edit before Alice's original message
- **THEN** after both arrive, Carol sees the edited message exactly as Bob does

#### Scenario: Late joiner
- **WHEN** Dave joins after a message was edited and another deleted
- **THEN** he sees the edited text with its mark and a tombstone for the deleted one, and never the earlier text

#### Scenario: Edit after delete
- **WHEN** an edit of a message arrives after its deletion
- **THEN** the message stays removed

### Requirement: Per-message menu
Each chat message SHALL offer a compact menu, shown on hover and keyboard focus and opened by a long press on touch screens, with Edit and Delete for the author and Delete for a facilitator; the menu and the inline editor SHALL be usable with the keyboard alone, have accessible names, and meet a 24 px minimum target (44 px on touch), in French and in English.

#### Scenario: Keyboard
- **WHEN** a person tabs to a message of hers, opens its menu with Enter and chooses Edit
- **THEN** the text is editable in place, Enter saves, Escape cancels and focus returns to the message

#### Scenario: Touch
- **WHEN** a person long-presses her own message on a phone
- **THEN** the menu opens with Edit and Delete

### Requirement: Removed messages stay out of the report
The retro report and the exports SHALL NOT contain chat messages, removed or not.

#### Scenario: Export after a delete
- **WHEN** the board is exported after messages were deleted
- **THEN** no chat text appears in the file

### Requirement: Undo a delete (optional)
After deleting her own message, its author MAY undo within 5 seconds; the deletion SHALL only be sent when the delay passes or the page is left.

#### Scenario: Undo in time
- **WHEN** Alice deletes her message and presses Undo after 3 seconds
- **THEN** the message is back and nobody else ever saw it removed
