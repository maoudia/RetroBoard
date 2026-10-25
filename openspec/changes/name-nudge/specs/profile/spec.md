## ADDED Requirements

### Requirement: Name nudge
A participant without a name who has not hidden their name on purpose SHALL be invited once per board, by a dismissible floating popup, to choose a name.

#### Scenario: Join without a name
- **WHEN** Bob joins a board with no name and keeps the default "show my name" option
- **THEN** after a few seconds a floating popup suggests choosing a name, and "Choose a name" opens the name dialog

#### Scenario: Not now
- **WHEN** Bob clicks "Not now"
- **THEN** the popup does not come back on this board

#### Scenario: Don't ask again
- **WHEN** Bob clicks "Don't ask again"
- **THEN** no board in this browser shows the popup again

#### Scenario: Anonymous on purpose
- **WHEN** a participant turned "show my name" off
- **THEN** the popup is never shown
