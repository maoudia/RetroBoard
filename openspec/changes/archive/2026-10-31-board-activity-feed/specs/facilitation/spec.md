## ADDED Requirements

### Requirement: Phase stepper
The board SHALL show the agenda as a compact step progress with the current phase and its remaining time, and SHALL display nothing under the columns.

#### Scenario: Middle of the retro
- **WHEN** the Group phase is running
- **THEN** the stepper shows earlier phases done, Group current with its time left, and the next phase

### Requirement: Activity feed
The board SHALL keep a short local log of board events that a participant can open from a discreet badge.

#### Scenario: Missed event
- **WHEN** voting closes while Bob reads a note
- **THEN** the badge shows one unread event and the log says voting closed

### Requirement: Visible notices
A time-up notice SHALL stay fully on screen until dismissed or hidden after its delay.

#### Scenario: Small phone
- **WHEN** time is up on a 360x640 screen
- **THEN** the whole notice is visible and can be dismissed
