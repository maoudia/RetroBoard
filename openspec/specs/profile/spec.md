# profile Specification

## Purpose
Local-only personal settings: name, avatar colour, appearance, recent boards and data wipe.

## Requirements

### Requirement: Local only
The system MUST keep profile settings in the browser and MUST NOT send them to the server, except the display name when joining a board.

#### Scenario: Wipe local data
- **WHEN** a person confirms "Erase everything on this device"
- **THEN** profile, settings, drafts and recent boards are removed from the browser

### Requirement: Duplicate names
A participant who joins with the name of someone already present SHALL be invited to choose another name or avatar.

#### Scenario: Second Alex
- **WHEN** Alex is on the board and another participant joins as alex
- **THEN** the newcomer sees a popup suggesting another name
