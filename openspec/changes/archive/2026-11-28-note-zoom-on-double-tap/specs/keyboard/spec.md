## ADDED Requirements

### Requirement: Zoom shortcut
The `z` key SHALL open the zoom on the focused note, and SHALL be listed in the help overlay; Enter SHALL keep editing the focused note.

#### Scenario: Zoom from the keyboard
- **WHEN** a participant focuses a note and presses "z"
- **THEN** the note opens enlarged, the arrow keys move between the ideas of the column and Escape closes it and returns the focus to the note

#### Scenario: Typing
- **WHEN** a participant types the letter "z" inside a note or a draft
- **THEN** no zoom opens

#### Scenario: Shortcuts off
- **WHEN** the shortcuts are switched off in the profile
- **THEN** "z" does nothing and the 3-dot menu item "Zoom" still works
