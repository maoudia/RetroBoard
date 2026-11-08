## ADDED Requirements

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
