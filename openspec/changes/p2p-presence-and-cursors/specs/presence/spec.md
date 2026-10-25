## Purpose

Lets participants see each other's cursors and status in real time without storing anything and without exhausting the free relay quota.

## ADDED Requirements

### Requirement: Live cursors
The system SHALL show each other participant's pointer position on the board with their display label and colour, with no more than 150 ms median latency on a peer-to-peer connection.

#### Scenario: Two participants
- **WHEN** participant A moves the pointer over column 2
- **THEN** participant B sees a cursor labelled with A's name (or "Anonymous") over column 2

### Requirement: Layout-independent cursors
The system SHALL position remote cursors relative to the column or note under the pointer, so a cursor points at the same element for participants with different window sizes or devices, and SHALL hide a cursor whose element is not visible locally.

#### Scenario: Different window sizes
- **WHEN** A, with a wide window, points at the middle of note N
- **THEN** B, with a narrow window, sees A's cursor over the middle of note N

### Requirement: Touch devices
On touch devices the system SHALL share focus instead of a continuous cursor (column in view, note being edited or dragged) and SHALL show other participants as avatar markers on column tabs and notes rather than floating cursors.

#### Scenario: Phone participant
- **WHEN** A on a phone edits a note in column 2
- **THEN** B sees A's marker on that note and "typing in column 2" in the participants menu, and no cursor for A

### Requirement: Ephemeral presence data
Cursor positions and presence states MUST NOT be part of the board event log and MUST NOT be written to replicas, files or exports.

#### Scenario: Export after cursors
- **WHEN** a board is exported after participants moved their cursors
- **THEN** the export contains no cursor or presence data

### Requirement: Peer-to-peer board
The system SHALL carry board events and cursors directly between participants (WebRTC), the relay only introducing them to each other (participant list, encrypted signalling, presence).

#### Scenario: Two participants with direct links
- **WHEN** B joins A's board and both can open a direct link
- **THEN** B receives the board from A's browser and sends its events to A without any `pub` frame to the relay

### Requirement: Relay fallback
The system SHALL let a participant who cannot open any direct link, or who turned direct links off, collaborate through the relay, with one peer of the mesh bridging the board to and from them; such participants share no cursors.

#### Scenario: Strict NAT
- **WHEN** WebRTC fails for C
- **THEN** C still sees and edits the board through the relay, and the others see C's notes

### Requirement: Cursor privacy controls
The system SHALL let each participant hide their own cursor from others and hide others' cursors from their view, and SHALL hide all cursors in presenter mode.

#### Scenario: Hide my cursor
- **WHEN** A turns off "Share my cursor"
- **THEN** no other participant sees A's cursor

### Requirement: Scale limits
The system SHALL display at most 10 remote cursors at a time, choosing the most recently active ones.

#### Scenario: Large retro
- **WHEN** 25 participants move their pointers
- **THEN** each participant sees at most 10 remote cursors

### Requirement: Snapshots
The system SHALL let the facilitator emit signed snapshots so that new participants do not need the full event history (moved from stateless-relay-and-replication: with the mesh, a joiner syncs from a peer, and a snapshot bounds that sync).

#### Scenario: Long retro
- **WHEN** a board has more than 2,000 events and a snapshot exists
- **THEN** a new participant loads the board from the snapshot plus later events
