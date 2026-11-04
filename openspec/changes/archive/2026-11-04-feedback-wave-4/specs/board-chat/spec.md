## ADDED Requirements

### Requirement: Opaque chat with author identity
The chat panel SHALL be opaque, and each message and the panel header SHALL show the author's configured colour and avatar.

#### Scenario: Readable over the board
- **WHEN** the chat is open over a busy board
- **THEN** the panel background is fully opaque and messages show each author's own colour and avatar

### Requirement: Presence status in chat
The chat SHALL show by default whether the user is connected and focused on the conversation, and a preference SHALL turn the status off.

#### Scenario: Default on, then off
- **WHEN** a user opens the chat for the first time
- **THEN** the status line is visible
- **AND WHEN** she disables the chat status in her preferences
- **THEN** the status line is no longer shown
