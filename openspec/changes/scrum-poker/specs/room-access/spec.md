## ADDED Requirements

### Requirement: A room has a kind inside its encrypted log
Every room SHALL have a kind, `board` when none is named. The kind SHALL be a field of the signed genesis event, so it travels only inside the encrypted payload, SHALL be written once by the facilitator key and SHALL NOT change afterwards. The link fragment, the join code and the passcode SHALL be the same for every kind and SHALL NOT name it. Every replica SHALL fold a room by the rules of its kind and SHALL ignore, identically, an event that belongs to another kind.

#### Scenario: A poker room
- **WHEN** a person starts a poker room
- **THEN** its genesis names the kind `poker`, the link has the fragment of any room (room id and keys, optionally the passcode flag), and no field outside the encrypted payload says what the room is

#### Scenario: The kind cannot change
- **WHEN** a second genesis, or a later event, claims another kind for a room that already has one
- **THEN** every replica ignores it and the room keeps its kind

#### Scenario: A client that does not know the event
- **WHEN** a client of an earlier version receives an event of a kind it does not know
- **THEN** it keeps the event, passes it on to its peers, does not fold it, and offers to reload for the newer version

#### Scenario: A link opened on the page of another kind
- **WHEN** a poker link is opened on the board page, or a board link on the poker page
- **THEN** the page says which kind the room is and offers to open it on the right page, without joining it as the wrong kind

#### Scenario: A code opens a room of any kind
- **WHEN** a person joins by a short code held by a poker room
- **THEN** the room link that the holder seals to the joiner is followed to the poker room page, and a link to any other path is still refused
