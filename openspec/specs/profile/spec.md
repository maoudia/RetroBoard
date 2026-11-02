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

### Requirement: Simple or advanced mode
A person SHALL be able to choose between a simple and an advanced mode, simple by default, remembered on this device; the mode only decides which options are shown.

#### Scenario: Switch from a dialog
- **WHEN** Alice switches to Advanced in the share dialog
- **THEN** the creation, share and export screens all show their advanced options from then on

### Requirement: Recent boards within reach
The boards this browser opened recently SHALL be listed where people land (home page, creation page, board title menu) and not only in the profile menu; the list SHALL stay on this device.

#### Scenario: Back from a board
- **WHEN** Alice leaves her board with the browser back button and lands on the creation page
- **THEN** her board is listed first under "Your recent boards" and one click reopens it

#### Scenario: Switch board
- **WHEN** Alice opens the board title menu
- **THEN** she sees her other recent boards and can open one

### Requirement: Profile settings follow the interface mode
The profile menu SHALL show the essential settings in simple mode and every setting in advanced mode; a hidden setting SHALL keep applying with its current value.

#### Scenario: Simple profile
- **WHEN** Alice opens her profile in simple mode
- **THEN** she sees language, theme variant and retention, and not density or motion
- **AND WHEN** she switches to advanced
- **THEN** density and motion appear
