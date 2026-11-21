## ADDED Requirements

### Requirement: An estimation phase in the agenda
The agenda SHALL support a phase of the kind `estimate`, with a planned time, shown in the stepper like any phase, added by the facilitator in the agenda editor, inserted after the current phase from the facilitator's menu, or started from a column's menu. It SHALL NOT be part of the four agenda presets, so that every existing retro and creation preset is unchanged. An agenda SHALL hold at most one estimation phase, and re-entering it SHALL continue where it was.

#### Scenario: Presets unchanged
- **WHEN** a retro is created with the 60-minute preset
- **THEN** its agenda has the same eight phases as before and no estimation phase

#### Scenario: Insert from the menu
- **WHEN** the facilitator chooses "Estimate tickets" during the Write phase of a running agenda
- **THEN** an estimation phase is inserted after Write, the rest of the agenda is kept and the phase starts when the facilitator starts the estimation

#### Scenario: A board with no agenda
- **WHEN** the facilitator starts an estimation on a board that has no agenda
- **THEN** a one-phase agenda with the estimation phase is created and started, and the starter has said so

#### Scenario: Re-entering
- **WHEN** the facilitator goes back to the estimation phase after leaving it
- **THEN** the queue, the estimates and the flags are as they were

### Requirement: What participants may do in the estimation phase
In the estimation phase participants SHALL NOT write, group, move, vote or edit notes and actions, and the tickets' notes SHALL be read-only for them, while chat, the presentation announcement and playing a card stay allowed. Facilitators MAY edit notes. With the rules off the board's other commands SHALL be open as in any phase.

#### Scenario: Read-only tickets
- **WHEN** a participant tries to edit a ticket note during the estimation phase
- **THEN** the edit is refused and the note is unchanged on every replica

#### Scenario: Chat stays open
- **WHEN** a participant posts a chat message during the phase
- **THEN** it is accepted

### Requirement: Leaving the phase with a round open
Ending the phase (by the next-phase action, the end action or the auto-chain) while a round is open SHALL abandon that round: its ballots SHALL never be revealed and its item SHALL return to the queue. The facilitator SHALL be asked to confirm first, and an auto-chain SHALL stop at the open round and ask.

#### Scenario: Confirm
- **WHEN** the facilitator presses "Next phase" while a round is open
- **THEN** a confirmation says a round is open, and the phase ends only if the facilitator confirms

#### Scenario: Chain
- **WHEN** the planned time of the phase ends with the chain on and a round is open
- **THEN** the phase does not advance by itself and the facilitator is asked

#### Scenario: Abandoned
- **WHEN** the facilitator confirms
- **THEN** no card of that round is ever shown and the ticket is in the queue when the phase is re-entered

### Requirement: An older client is told, not misled
A client that does not know the estimation phase SHALL keep and forward an agenda command that contains the kind `estimate` as an unknown event, SHALL fold nothing of it, and SHALL show the "newer version" notice, instead of dropping the command as invalid.

#### Scenario: Older client
- **WHEN** an agenda with an estimation phase reaches a client of the previous version
- **THEN** the client keeps the event, shows the notice and keeps the rest of the board intact
