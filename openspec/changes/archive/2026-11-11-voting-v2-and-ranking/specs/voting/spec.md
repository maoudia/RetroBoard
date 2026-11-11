## ADDED Requirements

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
