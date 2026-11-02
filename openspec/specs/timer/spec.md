# timer Specification

## Purpose
A shared countdown that every participant sees and can start, pause or reset during the retro.

## Requirements

### Requirement: Shared countdown
The system SHALL show the same countdown to every participant and SHALL let participants start, pause and reset it to preset durations.

#### Scenario: Time is up
- **WHEN** the countdown reaches zero
- **THEN** every participant sees a celebration and an optional chime plays if enabled locally

### Requirement: Phase-bound countdown
When a board has an agenda, the shared countdown SHALL show the remaining time of the current phase and SHALL be controlled through the agenda.

#### Scenario: Next phase
- **WHEN** the facilitator moves from Write to Group
- **THEN** the countdown resets to the Group duration for everyone

### Requirement: Start from the clock
The global timer SHALL start or pause when the facilitator clicks the clock, and pausing it SHALL pause the running phase.

#### Scenario: Pause
- **WHEN** the facilitator clicks the running clock
- **THEN** both the global timer and the phase clock stop

### Requirement: End-of-time popup
When a phase timer or the shared countdown reaches zero, every participant SHALL see a popup announcing it with the next phase; people who can drive the agenda SHALL get "Next phase" and "+2 min".

#### Scenario: Write ends
- **WHEN** the Write phase timer reaches zero
- **THEN** everyone sees "Time is up for Write - Next: Group", and a facilitator can press "Next phase"

#### Scenario: Typing
- **WHEN** a participant is typing a note when the timer ends
- **THEN** the popup appears without taking the focus from the composer

#### Scenario: Reconnect
- **WHEN** a participant reconnects after the timer ended
- **THEN** the popup is not shown a second time for the same timer

### Requirement: Warning and system notification
A "1 minute left" toast SHALL appear before the end unless turned off, and a person who enabled system notifications SHALL get one when the tab is hidden, without any push service.

#### Scenario: Hidden tab
- **WHEN** Bob enabled system notifications and the timer ends while his tab is in the background
- **THEN** his browser shows a system notification "Time is up for Write"
