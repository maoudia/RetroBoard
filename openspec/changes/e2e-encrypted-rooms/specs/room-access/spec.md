## Purpose

Protects every board so that only people holding the link (and the passcode, when set) can read or change it, and so that the service itself cannot read board content.

## ADDED Requirements

### Requirement: Fragment key
The system MUST generate a random 256-bit room key for each board and MUST carry it only in the URL fragment of invitation links, so it is never sent to the server.

#### Scenario: Key not sent to the server
- **WHEN** a participant opens an invitation link
- **THEN** no HTTP request or WebSocket message sent by the browser contains the room key

### Requirement: Encrypted events
The system MUST encrypt and authenticate every board event in the browser before it leaves the device, binding the ciphertext to the room, the event id and its clock value.

#### Scenario: Relay observes ciphertext only
- **WHEN** a note "Deploy on Fridays" is published
- **THEN** the relay receives an envelope whose payload does not contain the note text in any encoding

#### Scenario: Tampered event
- **WHEN** an envelope is modified or replayed into another room
- **THEN** every participant rejects it and the board state is unchanged

### Requirement: Optional passcode
The system SHALL let the facilitator set a passcode at creation; participants MUST then provide both the link and the passcode to read the board.

#### Scenario: Wrong passcode
- **WHEN** a person opens the link and enters a wrong passcode
- **THEN** the board content is not shown and the person can retry

### Requirement: Facilitator capability
The system MUST accept privileged events (settings, phases, vote reveal, role delegation, agent invitations) only when signed with the board's facilitator key or a delegated co-facilitator key.

#### Scenario: Participant forges a phase change
- **WHEN** a participant without the facilitator key sends a "start voting" event
- **THEN** every participant ignores it

### Requirement: Authorship
The system MUST sign each participant's events with a per-session key and MUST accept edits and deletions of a note only from the key that published it.

#### Scenario: Edit by someone else
- **WHEN** a participant sends an edit for a note published by another session key
- **THEN** every participant ignores the edit

### Requirement: Creation challenge
The system SHALL require a successful bot challenge before the relay accepts the first connection of a new room.

#### Scenario: Scripted room creation
- **WHEN** a client opens a new room without a valid challenge token
- **THEN** the relay refuses the connection
