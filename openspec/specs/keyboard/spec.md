# keyboard Specification

## Purpose
Single-key and modifier shortcuts that make the board operable from the keyboard on any layout (QWERTY and AZERTY), with discoverable hints and without clashing with typing or assistive technology.

## Requirements

### Requirement: Shortcut hints
On desktop the board SHALL show shortcut key caps next to actions unless the participant turns hints off.

#### Scenario: Turn off
- **WHEN** Alice turns hints off in her preferences
- **THEN** no key caps are shown on any board in this browser

### Requirement: Keyboard shortcuts
The system SHALL offer single-key shortcuts for frequent actions on pointer devices, listed in a help overlay opened with "?", and SHALL ignore them while the participant types or a dialog is open.

#### Scenario: Write and publish without the mouse
- **WHEN** a participant presses "2", then "n", types an idea, presses Enter, then Escape (leaving the field) and then "p"
- **THEN** the idea is published in the second column

#### Scenario: Typing
- **WHEN** a participant types the letter "p" inside a note
- **THEN** nothing is published

### Requirement: Shortcuts can be turned off
The profile SHALL let a participant turn single-key shortcuts off.

#### Scenario: Off
- **WHEN** shortcuts are off and the participant presses "n"
- **THEN** nothing happens
