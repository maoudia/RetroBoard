## Purpose

Defines where a board's state lives when the service stores nothing: in each participant's encrypted replica, converging deterministically, recoverable by any peer and exportable as a file.

## ADDED Requirements

### Requirement: No server-side persistence
The relay MUST NOT write board events, snapshots or metadata to any persistent storage; it MAY keep a bounded in-memory buffer of encrypted envelopes.

#### Scenario: Relay restart
- **WHEN** the relay instance for a room is evicted while no participant is connected
- **THEN** nothing about the room remains on the service

### Requirement: Local encrypted replica
Each participant's browser SHALL keep an encrypted replica of the boards it joined and SHALL delete it after the retention period chosen in the profile (default 30 days, minimum "when I leave").

#### Scenario: Retention expires
- **WHEN** a replica is older than the retention period
- **THEN** it is deleted on the next app start

### Requirement: Deterministic convergence
All participants who have received the same set of events MUST compute the same board state, regardless of arrival order; events that fail validation MUST be ignored by everyone.

#### Scenario: Concurrent votes
- **WHEN** two participants vote at the same time on the last allowed vote of a third participant's limit
- **THEN** every participant ends with the same vote counts

### Requirement: Resurrection from peers
When the relay has lost its memory, the system SHALL rebuild the room from the replicas of connected participants without user action.

#### Scenario: Relay wakes up empty
- **WHEN** the relay restarts during a retro and participants reconnect
- **THEN** within 5 seconds every participant sees the same board as before the restart

#### Scenario: Late joiner after resurrection
- **WHEN** a new participant joins after a resurrection
- **THEN** they receive the full current board from the room

### Requirement: Board file
The system SHALL let any participant export an encrypted board file and SHALL let a person with the link (and passcode) restore a board from it.

#### Scenario: Restore next week
- **WHEN** the facilitator imports last week's board file into an empty room link
- **THEN** the board appears exactly as exported

### Requirement: Snapshots
The system SHALL let the facilitator emit signed snapshots so that new participants do not need the full event history.

#### Scenario: Long retro
- **WHEN** a board has more than 2,000 events and a snapshot exists
- **THEN** a new participant loads the board from the snapshot plus later events
