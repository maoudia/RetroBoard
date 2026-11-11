# responsive-layout Specification

## Purpose
Defines how RetroBoard adapts from phones to TVs and projectors so every participant can write, vote and follow the retro on the screen they have.

## Requirements

### Requirement: Screen classes
The system SHALL support phone (360-599 px), tablet (600-1023), laptop (1024-1599), wide (1600-2399) and TV/projector (2400+) widths without horizontal page scrolling and with every action reachable.

#### Scenario: Phone
- **WHEN** a participant opens a 5-column board on a 360 px wide phone
- **THEN** one column is shown at a time with a column switcher, and writing, voting and publishing work

#### Scenario: 4K TV
- **WHEN** the board is displayed on a 3840 px wide screen
- **THEN** note text is at least 24 px, whatever text size the facilitator chose, and all columns are visible

### Requirement: Screen class attribute
The system SHALL expose the current screen class as `data-screen` on the root element (`phone`, `tablet`, `laptop`, `wide`, `tv`) with the breakpoints and a fluid type scale as CSS custom properties, so layout rules and type follow the class.

#### Scenario: Window resized
- **WHEN** the window moves from 1100 px to 2500 px wide
- **THEN** `data-screen` changes from `laptop` to `tv` and the type scale multiplier grows from 1 to 1.5

### Requirement: Phone navigation and menus
On phones the columns SHALL be reachable from a tab bar at the foot of the screen (one tab per column, at least 48 px high, the current column marked), and every menu SHALL open as a bottom sheet (full width, glued to the bottom edge, rows at least 48 px high, closed by a tap on the dimmed backdrop).

#### Scenario: Group from the menu on a phone
- **WHEN** a participant on a 360 px phone opens a note menu and chooses "Group with..."
- **THEN** the menu is a bottom sheet and the group is made without dragging

#### Scenario: Switch column
- **WHEN** a participant taps the third tab of the tab bar
- **THEN** the board scrolls to the third column and the tab is marked as current

### Requirement: Controls fit their label
The toolbar and the voting bar SHALL NOT cut a control or push it off the screen at 360, 768 and 1440 px, in French, English and the pseudo-locale: when the labels do not fit, the buttons become icon-only, keep their accessible name and show it as a tooltip.

#### Scenario: Long labels
- **WHEN** the board is opened with `?lang=pseudo` on a 768 px window
- **THEN** no control leaves the screen or its card, and a toolbar button without room for its label shows an icon with the same accessible name

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

#### Scenario: Move on a tablet
- **WHEN** a participant long-presses a note or a cluster and drops it on another column
- **THEN** it moves to that column

#### Scenario: Swipe is not a drag
- **WHEN** a participant moves a finger over a note before the press is long enough
- **THEN** the board scrolls and nothing is grouped or moved

### Requirement: Thumb-friendly primary actions
On phones the primary action of a page (open or create a board, publish) SHALL be a large centred button reachable with the thumb, at least 48 px high.

#### Scenario: Landing on a phone
- **WHEN** a visitor opens the landing page on a 360 px phone
- **THEN** the "Create a board" button spans the width at the bottom of the screen and is at least 48 px high
