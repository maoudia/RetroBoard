# board-chat Specification

## Purpose
Lateral text chat for everyone on a board: short messages, unread badge, clearing by facilitators, phone drawer. Lives in the signed event log, never stored on a server.

## Requirements

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

### Requirement: Roster for many people
With more than four people online the chat SHALL fold the roster into an overlapping avatar strip with an overflow count, and one control SHALL open the full roster without horizontal scrolling.

#### Scenario: Eight people
- **WHEN** eight people are online
- **THEN** the strip shows seven faces and +1, and the full roster opens on demand
