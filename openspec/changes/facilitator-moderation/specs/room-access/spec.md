## ADDED Requirements

### Requirement: Move to a fresh link
The system SHALL let the facilitator move a board to a new room and key, delivering the new link only to the participants who remain, with the board's history, authors and votes unchanged.

#### Scenario: Old link
- **WHEN** a removed participant opens the old link after the move
- **THEN** the board is closed for everyone who sees the closing and empty for anyone else: the new room, its key and its events are never theirs

#### Scenario: Same board, new room
- **WHEN** the facilitator moves the team to a fresh link
- **THEN** the remaining participants open the new link with the same notes, authors and votes, sealed under a new room key, and the new link names the signing room of the first (ADR-0034)

### Requirement: The new link reaches only the remaining participants
The system SHALL seal the new link to each remaining participant's own key and sign it with the lead facilitator's key, and SHALL NOT send it to a removed participant or accept it from anyone else.

#### Scenario: Removed participant excluded
- **WHEN** the facilitator removes participant X and moves the team to a fresh link
- **THEN** every hand-off in the old room is sealed to a remaining participant's key, none opens with X's key, and X's old room key opens nothing of the new room

#### Scenario: Forged hand-off
- **WHEN** a participant who is not the lead facilitator, or someone who only holds the old room key, sends a hand-off that points to another link
- **THEN** the other participants ignore it and stay on the board

#### Scenario: Participant offline during the move
- **WHEN** a participant is not connected when the facilitator moves the team
- **THEN** they are not sent the link, their old link opens the closed room, and the facilitator is told beforehand how many people are moved so the others can be sent the link with Share
