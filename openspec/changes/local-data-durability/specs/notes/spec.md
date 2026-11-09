## MODIFIED Requirements

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
