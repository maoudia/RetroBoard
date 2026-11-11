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

### Requirement: Results insights
The results page SHALL show charts of votes per idea, per column and their spread, participation counts and plain-language insights computed in the browser.

#### Scenario: Concentrated votes
- **WHEN** three ideas received 60% of the votes
- **THEN** the results page says that three ideas took 60% of the votes

### Requirement: Podium layout
The podium SHALL place the first, second and third ranks as a podium, with tied ideas side by side on the same step.

#### Scenario: Tie for second
- **WHEN** two ideas tie for second place
- **THEN** both stand on the second step and the next idea is third

### Requirement: Vote policy
The system SHALL let the facilitator set votes per person (1-20), max votes per item (1 to votes per person) and whether notes, clusters or both are votable, at creation and in options.

#### Scenario: Max per item
- **WHEN** max votes per item is 2 and a participant votes a third time on the same note
- **THEN** the third vote is refused with a clear message

### Requirement: Votes on clusters
When clusters are votable, a vote on a cluster SHALL count for the cluster as one idea, and notes inside a cluster SHALL NOT be votable separately.

#### Scenario: Vote on a cluster
- **WHEN** a participant votes on a cluster of 3 notes
- **THEN** the cluster's count increases by one and the inner notes show no vote buttons

### Requirement: Hidden counts
The system SHALL offer "hide counts during voting": participants see only their own votes until the facilitator reveals the tally.

#### Scenario: Hidden then revealed
- **WHEN** counts are hidden and the facilitator closes voting
- **THEN** all counts appear at the same time for everyone

### Requirement: Sealed ballot
The system SHALL offer a sealed ballot mode in which individual votes are readable only by the facilitator's device until the tally is revealed, and voter identities are never shown.

#### Scenario: Curious participant
- **WHEN** a participant inspects their local replica during a sealed ballot
- **THEN** they cannot determine who voted for what

#### Scenario: Tampered reveal
- **WHEN** the revealed counts are changed after the facilitator signed them, or are signed by someone else, or claim more votes than the ballots cast allow
- **THEN** every replica ignores the reveal and the counts stay hidden

#### Scenario: Facilitator leaves before the reveal
- **WHEN** the facilitator leaves with ballots cast
- **THEN** the ballots stay in the log and the holder of the facilitator link can reveal the tally from any device, or a new round can be started with a new key

### Requirement: Visible voting state
The system SHALL show each participant their remaining votes and the items they voted for at all times during voting, and SHALL allow undoing a vote while voting is open.

#### Scenario: Undo
- **WHEN** a participant removes a vote
- **THEN** the remaining count increases by one immediately

### Requirement: Ranking and podium
After voting closes, the system SHALL show a ranking view with a podium for the top three items and the full ordered list, keeping ties at the same rank, and SHALL let the facilitator create an action from any item.

#### Scenario: Tie for second place
- **WHEN** two items have the same second-highest count
- **THEN** both are shown at rank 2 and the next item is rank 4
