## MODIFIED Requirements

### Requirement: No server-side persistence
The relay MUST NOT write board events, snapshots or metadata to any persistent storage. It MAY keep a bounded in-memory buffer of the encrypted envelopes of every participant.

#### Scenario: Relay restart
- **WHEN** the relay instance for a room is evicted while no participant is connected
- **THEN** nothing about the room remains on the service

### Requirement: Resurrection from peers
When the relay has lost its memory, the system SHALL rebuild the room from the replicas of connected participants without user action, whether or not direct peer links exist.

#### Scenario: Relay wakes up empty
- **WHEN** the relay restarts during a retro and participants reconnect
- **THEN** within 5 seconds every participant sees the same board as before the restart

#### Scenario: Late joiner after resurrection
- **WHEN** a new participant joins after a resurrection
- **THEN** they receive the full current board from the room

#### Scenario: Late joiner after an eviction, no direct link
- **WHEN** the relay was evicted while two holders stayed connected, and a new participant who cannot open any direct link joins
- **THEN** a holder re-seeds the relay and the new participant sees the full board within 5 seconds

## ADDED Requirements

### Requirement: Two delivery paths
Every board event SHALL be sent over every open direct link, and also through the relay whenever the sender does not have a direct link with every other participant. Participants MUST ignore an event they already hold.

#### Scenario: Partial mesh
- **WHEN** Alice, Bob and Carol are on a board and only the Alice-Bob and Bob-Carol links open
- **THEN** a note published by Alice appears for Carol, and every participant ends with the same board

#### Scenario: No direct link at all
- **WHEN** no direct link can be opened between any participants
- **THEN** every participant still sees every note within 2 seconds

### Requirement: Publishing while reconnecting
Once a board has been opened in this tab, the system SHALL accept the participant's commands while the connection is lost. It SHALL keep them in the local replica and SHALL deliver them when a connection comes back.

#### Scenario: Network blip
- **WHEN** Bob loses his connection, publishes two notes, and gets the connection back
- **THEN** the two notes appear for everyone, and nothing is dropped or doubled

#### Scenario: Status stays visible
- **WHEN** the connection is lost
- **THEN** the board stays editable and shows a "reconnecting" status

### Requirement: Durable local writes
The system MUST write a participant's own events to the local replica before reporting them as published. Events still waiting to be written MUST be written when the tab closes or navigates away, unless the board was destroyed or the retention is "until I leave".

#### Scenario: Reload right after publishing
- **WHEN** the facilitator publishes a note and reloads the page at once, with nobody else online and the relay empty
- **THEN** the note is still on the board after the reload

### Requirement: Single creator
Only the tab that created a board MAY create its first event. Any other tab that finds no event for a board SHALL wait for a participant who holds it, and MUST NOT create a new board in its place.

#### Scenario: Facilitator link on a new device
- **WHEN** the facilitator opens his facilitator link on a phone while nobody else is online and the relay is empty
- **THEN** the phone shows "Waiting for someone who has this board", and once the laptop comes online the phone shows the original board

#### Scenario: Holder comes online
- **WHEN** a participant is waiting and a holder connects
- **THEN** the board appears without a reload
