## ADDED Requirements

### Requirement: Convergence across versions
A participant whose application is older than the author of an event SHALL keep that event, SHALL pass it on, and SHALL be told to reload; after the reload every participant MUST compute the same board.

#### Scenario: Unknown command
- **WHEN** a tab receives a correctly sealed and signed event whose command it does not know
- **THEN** the event is stored in the local replica, forwarded to its peers, and a notice offers to reload

#### Scenario: After the reload
- **WHEN** that tab reloads on the current version
- **THEN** it shows the same board as the other participants without a new download from them

### Requirement: Relay restart during a retro
When the relay closes every connection, direct links between participants SHALL stay open and board events SHALL keep flowing over them.

#### Scenario: Deploy in the middle of a vote
- **WHEN** the relay restarts while three participants hold direct links
- **THEN** a vote cast during the restart reaches the two others without waiting for the relay
