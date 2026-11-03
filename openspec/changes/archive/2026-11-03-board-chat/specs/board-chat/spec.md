## ADDED Requirements

### Requirement: Chat side panel
Participants SHALL exchange short text messages in a side panel, end-to-end encrypted, with an unread count.

#### Scenario: Ask the room
- **WHEN** Alice writes 'Five more minutes?' in the chat
- **THEN** every participant sees it in the panel and an unread badge if the panel is closed

### Requirement: Storage budget
The chat SHALL keep at most 200 messages per board on the device and the replica SHALL stay under a size cap per board.

#### Scenario: Long retro
- **WHEN** a board reaches 250 chat messages
- **THEN** the 50 oldest are dropped from the device copy
