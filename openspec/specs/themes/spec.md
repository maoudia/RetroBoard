# themes Specification

## Purpose
Visual themes (tokens, note colours, fonts, motion, ambient effects) chosen per board.

## Requirements

### Requirement: Board theme
The system SHALL apply the board's theme to every participant's board view.

#### Scenario: Theme change
- **WHEN** the theme of a board is changed in options
- **THEN** every participant sees the new theme

### Requirement: Personal theme override
The system SHALL let a participant display their own theme instead of the board theme on their screen.

#### Scenario: My theme
- **WHEN** a participant selects "Mine" and a theme in the profile
- **THEN** only that participant sees the chosen theme

### Requirement: Readable palettes
The system MUST keep text and note ink contrast at WCAG AA level in every theme.

#### Scenario: Contrast check
- **WHEN** the theme test suite runs
- **THEN** every palette passes the AA contrast ratio
