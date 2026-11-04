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
