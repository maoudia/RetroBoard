## Purpose

Defines how RetroBoard adapts from phones to TVs and projectors so every participant can write, vote and follow the retro on the screen they have.

## ADDED Requirements

### Requirement: Screen classes
The system SHALL support phone (360-599 px), tablet (600-1023), laptop (1024-1599), wide (1600-2399) and TV/projector (2400+) widths without horizontal page scrolling and with every action reachable.

#### Scenario: Phone
- **WHEN** a participant opens a 5-column board on a 360 px wide phone
- **THEN** one column is shown at a time with a column switcher, and writing, voting and publishing work

#### Scenario: 4K TV
- **WHEN** the board is displayed on a 3840 px wide screen
- **THEN** note text is at least 24 px and all columns are visible

### Requirement: Presenter mode
The system SHALL offer a presenter mode with larger type, the high-contrast variant, a QR code to join and hidden cursors.

#### Scenario: Join from the room
- **WHEN** a participant scans the QR code shown in presenter mode
- **THEN** the board opens on their phone (passcode still required when set)

### Requirement: Touch support
The system SHALL support grouping, moving and voting with touch on phones and tablets.

#### Scenario: Group on a tablet
- **WHEN** a participant long-presses a note and drops it on another note
- **THEN** the notes are clustered
