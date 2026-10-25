## ADDED Requirements

### Requirement: Agenda sized to the meeting
The system SHALL scale the chosen agenda preset to the duration of an imported meeting while keeping a minimum length per phase.

#### Scenario: 45-minute meeting
- **WHEN** the facilitator imports a 45-minute meeting with the 60-minute preset selected
- **THEN** the agenda totals 45 minutes and no phase is shorter than 1 minute
