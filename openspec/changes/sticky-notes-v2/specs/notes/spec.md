## ADDED Requirements

### Requirement: Sticky-note palette
The system SHALL offer 8 sticky-note colours familiar from paper notes, readable in the light and dark variant of every theme, and SHALL give each column a default colour used by its new notes.

#### Scenario: New note in a column
- **WHEN** a participant writes a note in a column whose default colour is pink
- **THEN** the draft and the published note are pink unless the author picks another colour

### Requirement: Recolour during the retro
The system SHALL let a participant change a note's colour at any time from a quick row of swatches on the note and from a full palette.

#### Scenario: Quick recolour
- **WHEN** a participant hovers a note and picks the blue swatch
- **THEN** the note turns blue for everyone

### Requirement: Composer actions
The composer SHALL offer "Add" and "Publish now" buttons, SHALL keep the text while the participant switches fields, and SHALL not require the Enter key.

#### Scenario: Phone
- **WHEN** a participant on a phone types an idea and taps "Publish now"
- **THEN** the idea is published without pressing Enter

### Requirement: Note length limit
The facilitator SHALL be able to set the maximum length of a note between 40 and 500 characters, and every note editor SHALL show a live character counter against that limit.

#### Scenario: Limit reached
- **WHEN** the limit is 100 and a participant has typed 100 characters
- **THEN** the counter shows "100 / 100" in the warning colour and no more characters can be typed

#### Scenario: Peer ignores the limit
- **WHEN** a modified client publishes a 300-character note on a board limited to 100
- **THEN** every participant ignores that note

### Requirement: Hover actions
On pointer devices the system SHALL reveal validate and dismiss actions when hovering or focusing a draft or a note being edited; on touch devices the same actions SHALL be in the note's menu.

#### Scenario: Dismiss a draft
- **WHEN** a participant hovers a draft and clicks the dismiss icon
- **THEN** the draft is deleted
