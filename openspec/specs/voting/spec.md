# voting Specification

## Purpose
Dot voting on notes with a per-person limit and an optional secret mode.

## Requirements

### Requirement: Vote limit
The system SHALL let each participant cast at most the board's vote limit, one vote per note, and SHALL show the remaining votes.

#### Scenario: Limit reached
- **WHEN** a participant has used all votes and votes again on a new note
- **THEN** the vote is refused with a "vote limit" message

### Requirement: Secret voting
The system MUST hide vote counts and voter identities from every participant while secret voting is on.

#### Scenario: Counts hidden
- **WHEN** secret voting is on
- **THEN** snapshots carry no vote counts and the UI shows none

### Requirement: Voting override
A facilitator SHALL be able to open voting outside the Vote phase, and the override SHALL end at the next phase change.

#### Scenario: Vote early
- **WHEN** the facilitator opens voting during the Group phase
- **THEN** participants can vote until the facilitator moves to another phase
