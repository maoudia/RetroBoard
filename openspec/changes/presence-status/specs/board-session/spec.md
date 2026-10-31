## ADDED Requirements

### Requirement: Connection state of participants
The board SHALL show for every connected participant whether they are linked directly, through the relay only or reconnecting, in colour and in words, and SHALL list who left.

#### Scenario: Relay only
- **WHEN** Bob's browser cannot open a direct link and uses the relay
- **THEN** everyone sees an amber dot next to Bob described as "through the relay"

### Requirement: Arrivals and departures
Joins and departures SHALL appear in the activity feed; a board option chosen at creation SHALL decide whether they also appear as short popups.

#### Scenario: Popups off
- **WHEN** the facilitator created the board with arrival popups off and Carol joins
- **THEN** no popup appears and the activity feed says Carol joined
