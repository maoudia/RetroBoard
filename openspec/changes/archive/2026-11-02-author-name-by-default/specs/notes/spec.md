## ADDED Requirements

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
