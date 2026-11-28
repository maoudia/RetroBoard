## ADDED Requirements

### Requirement: A board folds estimation commands during its estimation phase
A board SHALL fold the commands of the estimation body (the poker round commands and the queue commands) only while the running phase of its agenda is an estimation phase; at any other time, and in a poker room, every replica SHALL ignore them. The privileged ones SHALL be accepted only from the lead facilitator and the co-facilitators, even on a board that lets everyone facilitate, and a round SHALL be revealed only from the device that opened it.

#### Scenario: Outside the phase
- **WHEN** an estimation command reaches a board whose running phase is Vote
- **THEN** every replica ignores it

#### Scenario: Open board, privileged command
- **WHEN** a participant of an "Everyone facilitates" board sends a round start during the estimation phase
- **THEN** every replica ignores it, and the same participant's card is accepted

#### Scenario: The opener reveals
- **WHEN** a co-facilitator who did not open a round sends its reveal
- **THEN** every replica ignores it

#### Scenario: A poker room
- **WHEN** an estimation body is sent to a poker room
- **THEN** every replica ignores it

#### Scenario: Boards unchanged
- **WHEN** a board that never estimates is folded
- **THEN** its state is identical to the one the previous version folds, and the existing ledger and board tests pass unchanged

#### Scenario: Seating and cards are open
- **WHEN** a participant of an open board sends a seat and a card during the estimation phase
- **THEN** both are accepted

### Requirement: Snapshots never carry an open round
The signed snapshot of a board SHALL carry the queue, the flags, the estimates and, for each revealed round, its item, deck and verdict, and SHALL NOT carry the ballots of an open round, and no snapshot SHALL be cut while a round is open. The version of the fold rules SHALL be bumped so that a snapshot is trusted only by a client with the same rules.

#### Scenario: Mid-round joiner
- **WHEN** a person joins a board while a round is open
- **THEN** they see the table with who has voted and no card value, and they can play in the open round

#### Scenario: Version
- **WHEN** a client of the previous version meets a snapshot of the new version
- **THEN** it does not trust the snapshot and reads the history instead
