# talk-time Specification

## Purpose
Helps teams share speaking time fairly with visible, time-boxed speaking turns.

## Requirements

### Requirement: Talk time setting
The system SHALL let the facilitator choose a talk time mode (off, ring, popup) and a default budget per turn in retro settings.

#### Scenario: Popup mode
- **WHEN** talk time is set to popup with 2 minutes
- **THEN** starting a turn shows a start popup to everyone and a finish popup after 2 minutes

### Requirement: Speaking turns
The system SHALL let the facilitator start a turn for a participant, and SHALL let participants start their own turn when the facilitator allows it; only one turn SHALL be active at a time.

#### Scenario: Second turn
- **WHEN** a turn is active and the facilitator starts a turn for another participant
- **THEN** the first turn ends and the second starts

### Requirement: Budget display
The system SHALL show the remaining budget as a ring around the speaker's avatar and SHALL signal overtime visually.

#### Scenario: Overtime
- **WHEN** a speaker exceeds the budget
- **THEN** the ring turns to the overtime colour for everyone

### Requirement: Distribution in report
The system SHALL record total talk time per participant in the board and show it as shares in the retro report, using display names only for participants who show their name.

#### Scenario: Anonymous speaker
- **WHEN** an anonymous participant spoke for 4 minutes
- **THEN** the report shows "Anonymous" with the share, without other identifiers
