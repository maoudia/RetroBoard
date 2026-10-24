# timer Specification

## Purpose
A shared countdown that every participant sees and can start, pause or reset during the retro.

## Requirements

### Requirement: Shared countdown
The system SHALL show the same countdown to every participant and SHALL let participants start, pause and reset it to preset durations.

#### Scenario: Time is up
- **WHEN** the countdown reaches zero
- **THEN** every participant sees a celebration and an optional chime plays if enabled locally
