## ADDED Requirements

### Requirement: Name nudge
A participant without a name SHALL be invited once per board, by a dismissible floating popup, to choose a name.

#### Scenario: Join without a name
- **WHEN** Bob joins a board with no name and keeps the default "show my name" option
- **THEN** after a few seconds a floating popup suggests choosing a name, and "Choose a name" opens the name dialog

#### Scenario: Not now
- **WHEN** Bob clicks "Not now"
- **THEN** the popup does not come back on this board

#### Scenario: Don't ask again
- **WHEN** Bob clicks "Don't ask again"
- **THEN** no board in this browser shows the popup again

#### Scenario: Already has a name
- **WHEN** a participant has a name, whether or not their notes show it
- **THEN** the popup is never shown
