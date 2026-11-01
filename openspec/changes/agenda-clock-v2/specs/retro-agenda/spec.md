## ADDED Requirements

### Requirement: Global time follows the real time spent
The global elapsed time of the retro SHALL be the time actually spent in finished phases plus the time of the running phase; skipping a phase SHALL NOT add its planned time, and the planned total SHALL NOT change.

#### Scenario: Skipping a phase
- **WHEN** the facilitator moves to the next phase one minute into a fifteen minute phase of a one hour retro
- **THEN** the global elapsed time is one minute and the global time left is fifty-nine minutes

### Requirement: Phase detail from the progress bar
Each segment of the phase bar SHALL open, on click or keyboard activation, a popover with the phase name, the real time spent in it and its planned time.

#### Scenario: Finished phase
- **WHEN** Bob activates the segment of a phase that ran for 4:12
- **THEN** a popover names the phase and shows 4:12 spent of the planned time

#### Scenario: Skipped phase
- **WHEN** Bob activates the segment of a phase that was left without time spent
- **THEN** the popover says it was skipped

### Requirement: Start and pause inside the ring
The start, pause and resume control of the agenda SHALL be part of the ring component, in the same frame as the rings and the time.

#### Scenario: Facilitator
- **WHEN** the facilitator looks at the toolbar clock
- **THEN** the play or pause button is inside the clock frame, and participants see no button
