## ADDED Requirements

### Requirement: Rename reaches published notes
When a participant changes their display name, the system SHALL show the new name on the notes they already published as signed, for every participant. Notes published anonymously MUST stay anonymous. A name set by a facilitator rename MUST take precedence.

#### Scenario: Signed note follows the rename
- **WHEN** Alex publishes a signed note and then renames their profile to "Alexandre"
- **THEN** every participant sees "Alexandre" on that note

#### Scenario: Anonymous note unchanged
- **WHEN** Alex publishes an anonymous note and then renames their profile
- **THEN** the note stays anonymous for everyone

#### Scenario: Facilitator rename wins
- **WHEN** a facilitator renamed Alex to "Al" and Alex then renames their profile
- **THEN** the notes still show "Al"
