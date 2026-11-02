## MODIFIED Requirements

### Requirement: Facilitator by creation
When a board is created in "One facilitator" mode, the person who creates it SHALL be its facilitator and SHALL be shown with a facilitator badge to everyone. When it is created in "Everyone facilitates" mode, nobody SHALL be shown as facilitator.

#### Scenario: Creator joins
- **WHEN** the creator of a "One facilitator" board opens their facilitator link
- **THEN** they see facilitator controls and others see their badge

#### Scenario: Open board
- **WHEN** Bob joins a board created with "Everyone facilitates"
- **THEN** Bob sees the facilitation controls and nobody has a facilitator badge

### Requirement: Privileged actions
Only the facilitator and co-facilitators MUST be able to change phases, timers, talk turns, vote closing and reveal, lock state, theme, settings and agent invitations, unless "Everyone facilitates" is on, which SHALL be the default for new boards. Switching between the two modes MUST require the facilitator capability in both modes.

#### Scenario: Open facilitation
- **WHEN** "Everyone facilitates" is on and a participant starts the vote phase
- **THEN** the phase starts for everyone

#### Scenario: Participant tries to close facilitation
- **WHEN** a participant without the facilitator link sends a settings change turning "Everyone facilitates" off
- **THEN** every peer rejects it and the board stays open

## ADDED Requirements

### Requirement: Phase rules for everyone on open boards
On a board with "Everyone facilitates", phase rules SHALL apply to every participant who does not hold the facilitator capability.

#### Scenario: Note during the vote phase
- **WHEN** the agenda runs with rules on an open board, the Vote phase is current, and a participant tries to add a note
- **THEN** the note is rejected and the composer shows that writing is closed
