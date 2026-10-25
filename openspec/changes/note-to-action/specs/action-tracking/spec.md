## ADDED Requirements

### Requirement: Action from a note
A note or group menu SHALL offer "Create an action", which opens the actions panel with a form filled with the note text, the note's shown author as owner, and an owner dropdown to change it; the action SHALL keep a link to its source note.

#### Scenario: Named author
- **WHEN** Alice chooses "Create an action" on Bob's note "Release notes are late"
- **THEN** the actions panel opens with text "Release notes are late" and owner Bob, and Alice can pick another owner before adding

#### Scenario: Anonymous note
- **WHEN** a participant creates an action from an anonymous note
- **THEN** the owner field is empty

#### Scenario: Phase does not allow actions
- **WHEN** the agenda runs with rules in the Write phase
- **THEN** "Create an action" is disabled with the reason
