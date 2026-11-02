# facilitation Specification

## Purpose
Defines who runs a retro: the facilitator, co-facilitators and participants, and which actions each role may perform.

## Requirements

### Requirement: Facilitator by creation
When a board is created in "One facilitator" mode, the person who creates it SHALL be its facilitator and SHALL be shown with a facilitator badge to everyone. When it is created in "Everyone facilitates" mode, nobody SHALL be shown as facilitator.

#### Scenario: Creator joins
- **WHEN** the creator of a "One facilitator" board opens their facilitator link
- **THEN** they see facilitator controls and others see their badge

#### Scenario: Open board
- **WHEN** Bob joins a board created with "Everyone facilitates"
- **THEN** Bob sees the facilitation controls and nobody has a facilitator badge

### Requirement: Delegation
The facilitator SHALL be able to promote a participant to co-facilitator, revoke it, and hand over the facilitator role.

#### Scenario: Hand over
- **WHEN** the facilitator hands over the role to Bob
- **THEN** Bob gets facilitator controls and the previous facilitator becomes a co-facilitator

### Requirement: Privileged actions
Only the facilitator and co-facilitators MUST be able to change phases, timers, talk turns, vote closing and reveal, lock state, theme, settings and agent invitations, unless "Everyone facilitates" is on, which SHALL be the default for new boards. Switching between the two modes MUST require the facilitator capability in both modes.

#### Scenario: Open facilitation
- **WHEN** "Everyone facilitates" is on and a participant starts the vote phase
- **THEN** the phase starts for everyone

#### Scenario: Participant tries to close facilitation
- **WHEN** a participant without the facilitator link sends a settings change turning "Everyone facilitates" off
- **THEN** every peer rejects it and the board stays open

### Requirement: Hide a participant
The facilitator SHALL be able to hide a participant's future notes from the board for everyone and SHALL be told that a new board is needed to fully exclude someone who has the link.

#### Scenario: Disruptive participant
- **WHEN** the facilitator hides participant X
- **THEN** X's new notes are not shown to others and the facilitator sees a "move to a new board" suggestion

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

### Requirement: Phase rules for everyone on open boards
On a board with "Everyone facilitates", phase rules SHALL apply to every participant who does not hold the facilitator capability.

#### Scenario: Note during the vote phase
- **WHEN** the agenda runs with rules on an open board, the Vote phase is current, and a participant tries to add a note
- **THEN** the note is rejected and the composer shows that writing is closed

### Requirement: One lead facilitator
On a "One facilitator" board (see open-facilitation-default), the system SHALL have exactly one lead facilitator at a time: the creator first, then whoever confirms taking over with the facilitator link, or the person the lead hands over to.

#### Scenario: Takeover with the link
- **WHEN** Bob opens the facilitator link while Alice leads and confirms "Take over facilitation"
- **THEN** Bob becomes the lead facilitator, Alice becomes a co-facilitator and is told

#### Scenario: Opening the link without taking over
- **WHEN** Bob opens the facilitator link and declines to take over
- **THEN** Bob joins as a co-facilitator and Alice stays the lead

### Requirement: Visible facilitator
The system SHALL show the lead facilitator with a crown badge on their pointer, on their presence markers and in the participants list.

#### Scenario: Pointer
- **WHEN** the lead facilitator moves their pointer
- **THEN** others see their pointer with a crown above the name

### Requirement: Theme by any lead
A theme chosen by the lead facilitator SHALL apply to every participant whether or not the lead created the board.

#### Scenario: After handover
- **WHEN** Alice hands over to Carol and Carol picks another theme
- **THEN** every participant sees Carol's theme
