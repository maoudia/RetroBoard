## ADDED Requirements

### Requirement: Progress bar can be turned off
The facilitator SHALL be able to turn the phase progress bar off for the board, at creation and later in the board options, and it SHALL be on by default; turning it off SHALL hide the bar for everyone while the ring, the timer and the end-of-phase popup keep working.

#### Scenario: On by default
- **WHEN** a facilitator creates a board without touching the switch
- **THEN** the phase bar is shown under the toolbar once the agenda exists

#### Scenario: Off at creation
- **WHEN** a facilitator turns "Show the progress bar" off on the creation page
- **THEN** the board opens without the phase bar, for every participant, and the ring still starts and advances the phases

#### Scenario: Changed later
- **WHEN** the facilitator turns the switch back on in the board options
- **THEN** the phase bar appears for everyone

#### Scenario: Old boards
- **WHEN** a board created before this option is opened
- **THEN** the phase bar is shown as before
