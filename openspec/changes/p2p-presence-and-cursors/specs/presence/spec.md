## Purpose

Lets participants see each other's cursors and status in real time without storing anything and without exhausting the free relay quota.

## ADDED Requirements

### Requirement: Live cursors
The system SHALL show each other participant's pointer position on the board with their display label and colour, with no more than 150 ms median latency on a peer-to-peer connection.

#### Scenario: Two participants
- **WHEN** participant A moves the pointer over column 2
- **THEN** participant B sees a cursor labelled with A's name (or "Anonymous") over column 2

### Requirement: Ephemeral presence data
Cursor positions and presence states MUST NOT be part of the board event log and MUST NOT be written to replicas, files or exports.

#### Scenario: Export after cursors
- **WHEN** a board is exported after participants moved their cursors
- **THEN** the export contains no cursor or presence data

### Requirement: Relay fallback
The system SHALL fall back to the relay for cursors when a peer-to-peer connection cannot be established, sending at most 4 updates per second per participant and only while the pointer moves.

#### Scenario: Strict NAT
- **WHEN** WebRTC fails between A and B
- **THEN** B still sees A's cursor, updated at most 4 times per second

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
