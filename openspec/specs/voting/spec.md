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

### Requirement: Votable columns
Votes SHALL only be possible on columns marked votable.

#### Scenario: Happy column
- **WHEN** Bob tries to vote on a note in "What went well" that is not votable
- **THEN** there is no vote button and the fold refuses the vote

### Requirement: Results charts
After voting the system SHALL show the podium and charts of the top ideas, the votes per column and the vote participation, computed on the device, and SHALL show no chart while vote counts are hidden.

#### Scenario: After closing the vote
- **WHEN** the facilitator closes a vote with 24 votes cast
- **THEN** the results page shows the podium, the top ideas as bars, the share of votes per column and the number of votes used

#### Scenario: Secret vote open
- **WHEN** counts are hidden
- **THEN** the results page says results come after the vote and draws no chart

### Requirement: Accessible charts
Every chart SHALL have a text alternative listing its values.

#### Scenario: Screen reader
- **WHEN** a screen reader reaches the votes-per-column chart
- **THEN** it reads each column with its share of votes

### Requirement: Deduplicated voting menu
The voting menu SHALL show each fact once, with short labels (at most three words) and an icon that matches the meaning, and its on/off settings SHALL use the shared toggle.

#### Scenario: Voting closed
- **WHEN** voting is closed
- **THEN** the closed state appears once in the menu and the action offered is to open it again

### Requirement: Spend all votes on one idea
A board option, off by default and shown in the advanced options, SHALL let a participant place her whole vote budget on a single idea.

#### Scenario: Concentrate votes
- **WHEN** the option is on and Alice has 5 votes
- **THEN** she can put all 5 on one idea

#### Scenario: Default
- **WHEN** the option is off
- **THEN** the existing per-idea cap applies

### Requirement: Ticket vote bar
The voting menu SHALL show remaining votes as tickets.

#### Scenario: Votes used
- **WHEN** a user casts a vote
- **THEN** one ticket changes from filled to outlined

### Requirement: Voting that is closed by the phase is explained to everyone
Outside the Vote phase the vote control of a note or a cluster SHALL show a disabled state with the reason and the phase that opens voting, for every role; a person who can override the phase (facilitator, co-facilitator, everyone on an open board, the sole participant of a solo board) SHALL also see an "Open voting now" action that applies the existing override.

#### Scenario: Solo user in the Write phase
- **WHEN** Alice, alone on a solo board whose agenda is in the Write phase, looks at a note
- **THEN** the vote control is disabled, says that voting opens in the Vote phase, and offers "Open voting now"

#### Scenario: Open it now
- **WHEN** Alice presses "Open voting now"
- **THEN** she can vote immediately and the override ends at the next phase change, as for a shared board

#### Scenario: Participant on a shared board
- **WHEN** Bob, a participant, sees the same note in the Write phase
- **THEN** he sees the same disabled state and reason, without the "Open voting now" action

#### Scenario: No agenda
- **WHEN** the board has no running agenda
- **THEN** the vote control is enabled as before
