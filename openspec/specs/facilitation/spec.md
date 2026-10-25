# facilitation Specification

## Purpose
Defines who runs a retro: the facilitator, co-facilitators and participants, and which actions each role may perform.

## Requirements

### Requirement: Facilitator by creation
The person who creates a board SHALL be its facilitator and SHALL be shown with a facilitator badge to everyone.

#### Scenario: Creator joins
- **WHEN** the creator opens their facilitator link
- **THEN** they see facilitator controls and others see their badge

### Requirement: Delegation
The facilitator SHALL be able to promote a participant to co-facilitator, revoke it, and hand over the facilitator role.

#### Scenario: Hand over
- **WHEN** the facilitator hands over the role to Bob
- **THEN** Bob gets facilitator controls and the previous facilitator becomes a co-facilitator

### Requirement: Privileged actions
Only the facilitator and co-facilitators MUST be able to change phases, timers, talk turns, vote closing and reveal, lock state, theme, settings and agent invitations, unless "facilitation open to everyone" is on.

#### Scenario: Open facilitation
- **WHEN** "facilitation open to everyone" is on and a participant starts the vote phase
- **THEN** the phase starts for everyone

### Requirement: Hide a participant
The facilitator SHALL be able to hide a participant's future notes from the board for everyone and SHALL be told that a new board is needed to fully exclude someone who has the link.

#### Scenario: Disruptive participant
- **WHEN** the facilitator hides participant X
- **THEN** X's new notes are not shown to others and the facilitator sees a "move to a new board" suggestion
