## ADDED Requirements

### Requirement: Toasts float in a safe zone
Toasts SHALL be fixed floating cards that never shift the layout and SHALL NOT cover the writing area or the content of the board columns.

#### Scenario: Publishing on a phone
- **WHEN** a participant publishes a note on a phone
- **THEN** the confirmation appears as a floating card under the header, the writing area stays fully visible and usable

### Requirement: Toasts are readable at every size
A toast SHALL wrap its text, stay within the viewport minus gutters and safe areas, show a tone icon, and give its action a target of at least 44 px.

#### Scenario: Narrow screen
- **WHEN** a long message appears at 360 px width
- **THEN** it wraps on several lines and the action stays reachable

### Requirement: Toasts respect time and motion
A toast SHALL show its remaining time, pause while hovered or focused, be dismissible, and drop its animation under reduced motion; warnings SHALL be announced assertively and others politely.

#### Scenario: Reading time
- **WHEN** a person hovers a toast
- **THEN** it stays until the pointer leaves

### Requirement: Voting is optional and its bar is calm
Voting SHALL be switchable on or off for a board at creation and in the options; when off, the voting bar, the vote buttons and the vote and ranking phases SHALL NOT appear. The voting bar SHALL show the voting state as one chip with a word and a colour, and publishing all drafts SHALL live in the toolbar.

#### Scenario: Board without voting
- **WHEN** a board is created with voting off
- **THEN** no voting bar or vote button is shown and the options offer to turn voting on

#### Scenario: State chip
- **WHEN** voting is open and a facilitator taps the chip
- **THEN** voting closes and the chip reads closed

### Requirement: Presentation start is announced
When someone starts the presentation view, every other participant SHALL see a popup naming who started it (or saying it was started when that person is anonymous). Presentation text SHALL stay inside its note and SHALL use the available screen.

#### Scenario: Alice presents
- **WHEN** Alice opens the presentation view
- **THEN** every other participant sees a notification that Alice started presentation mode

### Requirement: The timer panel is a player
The agenda panel SHALL present the rings as a player cover with the play or pause button in the centre, icon-only transport buttons for previous, extend and next, and two same-style buttons to go to the closing phase and to end. The inner ring SHALL show one segment per phase, lit as phases finish. The panel SHALL show everything without a scrollbar when it fits and a visible scrollbar only when it cannot.

#### Scenario: Roomy screen
- **WHEN** a facilitator opens the timer panel on a tall screen
- **THEN** all phases and controls are visible without scrolling

#### Scenario: Steps ring
- **WHEN** two phases are finished
- **THEN** two inner-ring segments are lit
