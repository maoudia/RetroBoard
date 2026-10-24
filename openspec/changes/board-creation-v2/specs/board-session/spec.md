## ADDED Requirements

### Requirement: Creation options
The board creation flow SHALL let the facilitator set the title, theme, format, agenda, vote policy, maximum participants, action status mode, carry-over, passcode and talk time, and SHALL offer a one-click quick start using the team defaults.

#### Scenario: Quick start
- **WHEN** a facilitator with a saved team profile clicks "Quick start"
- **THEN** a board is created with the team's defaults and the next sprint title

### Requirement: Smart title
The system SHALL propose the title "<Team> - Sprint <N> - <date>" from the local team profile, incrementing the sprint number from the last retro, and SHALL fall back to "Retro <date>" without a team profile.

#### Scenario: Next sprint
- **WHEN** the last retro of "Team Atlas" was Sprint 42
- **THEN** the proposed title is "Team Atlas - Sprint 43 - <today>"

### Requirement: Participant cap
The system MUST refuse new participants beyond the board's maximum, show them a clear message, and cap the maximum to the facilitator's plan.

#### Scenario: Board full
- **WHEN** a board limited to 10 participants has 10 connected and an 11th opens the link
- **THEN** the 11th sees "This retro is full" and is not connected
