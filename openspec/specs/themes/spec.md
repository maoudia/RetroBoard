# themes Specification

## Purpose
Visual themes (tokens, note colours, fonts, motion, ambient effects) chosen per board.

## Requirements

### Requirement: Board theme
The system SHALL apply the board's theme to every participant's board view.

#### Scenario: Theme change
- **WHEN** the theme of a board is changed in options
- **THEN** every participant sees the new theme

### Requirement: Readable palettes
The system MUST keep text and note ink contrast at WCAG AA level in every theme.

#### Scenario: Contrast check
- **WHEN** the theme test suite runs
- **THEN** every palette passes the AA contrast ratio

### Requirement: Light and dark variants
Every theme MUST provide a light and a dark variant, and each participant SHALL be able to choose light, dark or system for their own screen without changing the board theme.

#### Scenario: Dark variant on a light theme
- **WHEN** a participant selects "Dark" while the board uses Studio
- **THEN** that participant sees Studio dark and every other participant keeps their own variant choice

### Requirement: Theme set by the facilitator
The system MUST only accept board theme changes made by the facilitator or a co-facilitator.

#### Scenario: Participant tries to change the theme
- **WHEN** a participant without facilitator rights opens board options
- **THEN** the theme picker is read-only and shows who can change it

### Requirement: Product pages use the product design
The landing page, the board creation page and the profile dialog MUST use the product design system and MUST NOT use a board theme.

#### Scenario: Profile after a Halloween board
- **WHEN** a person who just left a Halloween board opens the profile from the landing page
- **THEN** the profile dialog uses the landing design, not Halloween

### Requirement: Variant contrast
Both variants of every theme MUST meet WCAG AA contrast for text, note ink and controls.

#### Scenario: Contrast suite
- **WHEN** the theme test suite runs
- **THEN** every theme variant passes the AA checks

### Requirement: Icon at the left of every labelled button
Every button that shows a text label SHALL show an icon at the left of that label, except numeric or status chips and toggle segments.

#### Scenario: Confirmation dialog
- **WHEN** the facilitator opens the "Empty this column" confirmation
- **THEN** the Cancel button shows an x icon and the confirm button shows an eraser icon, both at the left of their labels

#### Scenario: Guard
- **WHEN** a labelled button without an icon is added to a component
- **THEN** the design guard test fails
