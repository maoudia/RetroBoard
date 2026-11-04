## ADDED Requirements

### Requirement: The end of the agenda closes voting
When the last phase is left or the retro is ended, voting SHALL close and the results SHALL be shown.

#### Scenario: End the retro while voting is open
- **WHEN** the facilitator ends the agenda
- **THEN** voting is closed for everyone

### Requirement: Plain end state in the stepper
The stepper SHALL show "finished" and "not started" as plain text; only a running phase offers the elapsed or left switch.

#### Scenario: Agenda finished
- **WHEN** the agenda is finished
- **THEN** the stepper line is not interactive
