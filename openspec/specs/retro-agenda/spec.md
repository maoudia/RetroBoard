# retro-agenda Specification

## Purpose
Structures a retro as a time-boxed sequence of phases and shows everyone where the team is in the overall time budget.

## Requirements

### Requirement: Predefined agenda
The system SHALL offer a default one-hour agenda (check-in, previous actions, write, group, vote, ranking, actions, close) and SHALL let the facilitator edit phases and durations at creation.

#### Scenario: Default agenda
- **WHEN** a facilitator creates a board without editing the agenda
- **THEN** the board has 8 phases totalling 60 minutes

### Requirement: Global countdown ring
The system SHALL show every participant a ring divided into one segment per phase, filled according to elapsed time, and SHALL expand it into a panel listing phases with planned, elapsed and remaining time.

#### Scenario: Expand the ring
- **WHEN** a participant clicks the ring during the Write phase
- **THEN** a panel shows each phase, marks Write as current and shows its remaining minutes

### Requirement: Phase control
The facilitator SHALL be able to start, pause, resume, extend, skip and end phases; extending a phase SHALL take the time from later phases unless the facilitator chooses to extend the total.

#### Scenario: Borrow time
- **WHEN** the facilitator extends Write by 3 minutes with "take from later phases"
- **THEN** the total stays 60 minutes and later phases are shortened proportionally

#### Scenario: Overtime
- **WHEN** a phase reaches zero and the facilitator does nothing
- **THEN** its ring segment shows overtime and a discreet notice is shown to the facilitator

### Requirement: Phase rules
The system SHALL enable the actions relevant to the current phase and SHALL keep other actions available only to the facilitator, with an option to disable phase rules.

#### Scenario: Voting outside the vote phase
- **WHEN** phase rules are on and the current phase is Write
- **THEN** vote buttons are hidden for participants

### Requirement: Auto-publish at end of writing
The system SHALL offer a setting that publishes every participant's drafts when the Write phase ends.

#### Scenario: Write phase ends
- **WHEN** auto-publish is on and the Write phase ends with 2 drafts on a participant's device
- **THEN** the 2 drafts are published

### Requirement: Go to closing
A facilitator SHALL be able to jump to the close phase from any phase after a confirmation, and the report SHALL show the actual time of every phase.

#### Scenario: Short on time
- **WHEN** the facilitator chooses Go to closing during the Group phase
- **THEN** the board is in the close phase and skipped phases show no actual time

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

### Requirement: Elapsed or remaining time
A participant SHALL be able to choose, separately for the phase stepper and for the global ring, whether they show the elapsed or the remaining time; by default the stepper SHALL show elapsed time and the ring SHALL show remaining time.

#### Scenario: Defaults
- **WHEN** Bob opens a running retro for the first time
- **THEN** the stepper shows how long the current phase has run and the ring shows the time left for the retro

#### Scenario: Switch
- **WHEN** Bob sets the stepper to remaining time
- **THEN** the stepper shows the time left in the phase and the ring is unchanged

### Requirement: Visible overtime
A phase past its planned time SHALL show zero time left in the overtime colour, then the time over as "+m:ss".

#### Scenario: Two minutes over
- **WHEN** the Group phase is two minutes past its planned time
- **THEN** the stepper segment is in the overtime colour and reads "+2:00"
