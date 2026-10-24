## Purpose

Keeps ideas readable and easy to group when a board holds many notes, with sticky-note colours and motion that support rather than distract.

## ADDED Requirements

### Requirement: Sticky-note palette
Each theme variant SHALL provide eight note colours modelled on classic sticky notes (yellow, pink, blue, green, orange, lilac, mint, white) with note ink meeting WCAG AA contrast.

#### Scenario: Colour picker
- **WHEN** a participant opens the colour menu of a note
- **THEN** eight sticky-note colours are offered with accessible names

### Requirement: Readability at scale
The system SHALL keep note text at or above a minimum readable size for the screen class, SHALL truncate longer text with a "read more" affordance instead of shrinking further, and SHALL offer density, zoom and a column focus mode.

#### Scenario: 60 notes in a column
- **WHEN** a column holds 60 notes on a laptop
- **THEN** every visible note text is at least 14 px and the column scrolls

### Requirement: Search and filter
The system SHALL let a participant filter visible notes by text, colour, author and "has votes", without changing the board for others.

#### Scenario: Filter by text
- **WHEN** a participant types "deploy" in the board filter
- **THEN** only notes containing "deploy" are shown on their screen

### Requirement: Motion with restraint
Note animations SHALL last under 400 ms, SHALL never move text while it is being read or edited, and MUST be disabled when the participant prefers reduced motion.

#### Scenario: Reduced motion
- **WHEN** reduced motion is on
- **THEN** publishing and grouping happen without animated transitions

### Requirement: Similar idea hint
While writing, the system SHALL show a hint when published ideas in the same column look similar, computed on the device.

#### Scenario: Duplicate
- **WHEN** a participant types "CI is slow" and "Slow CI" is already published
- **THEN** a hint links to the existing idea
