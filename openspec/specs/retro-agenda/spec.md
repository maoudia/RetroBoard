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
