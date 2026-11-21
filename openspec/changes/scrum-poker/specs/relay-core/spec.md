## ADDED Requirements

### Requirement: The relay carries no room kind
The relay MUST learn nothing about what a room is used for. The only attributes of a room it holds MUST be its id and its connections, and an envelope MUST have exactly the fields of the protocol (version, room, id, clock, ciphertext): a frame whose envelope has any other field MUST be refused as invalid, so no client can send a kind marker through it. The page path of a room MUST NOT contain its room id.

#### Scenario: A marker is refused
- **WHEN** a connection sends a `pub`, `eph` or `sig` frame whose envelope has an extra field such as `kind`
- **THEN** the sender receives `err` with code `invalid`, nothing is buffered, and no other connection receives anything

#### Scenario: A poker room looks like a board room
- **WHEN** the same sequence of frames of a board room and of a poker room goes through the relay
- **THEN** the relay answers with the same frames and close codes, and every envelope it forwards has the same five fields

#### Scenario: Nothing in the page request names the room
- **WHEN** a person opens a room
- **THEN** no HTTP request carries the room id or the key fragment, and the room id reaches the relay only in the WebSocket address
