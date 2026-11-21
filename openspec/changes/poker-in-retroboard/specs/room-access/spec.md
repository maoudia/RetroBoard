## ADDED Requirements

### Requirement: Room tools are shared by both kinds of room
A poker room SHALL fold the commands of a short list of room tools exactly as a board does, with the same privileges: chat, the timer, talk time, the presentation announcement, the settings that mean something for a room and closing the room for good. Every other board command SHALL still be ignored in a poker room, and every poker command SHALL still be ignored in a board outside the estimation phase of `board-estimation-phase`.

#### Scenario: Chat in a room
- **WHEN** a participant of a poker room posts a chat message
- **THEN** every participant sees it, the relay sees one envelope of five fields, and the message is encrypted like any other event

#### Scenario: A privileged tool
- **WHEN** a participant without moderation rights starts the timer of a poker room with "Everyone moderates" off
- **THEN** every replica ignores it

#### Scenario: Board content in a room
- **WHEN** a note command is sent to a poker room
- **THEN** every replica ignores it

#### Scenario: Close the room
- **WHEN** the moderator closes a poker room
- **THEN** every later event is ignored by every replica and the room shows that it is closed

#### Scenario: Boards unchanged
- **WHEN** the existing ledger and board tests run
- **THEN** they pass unchanged

#### Scenario: The list
- **WHEN** the shared list is read
- **THEN** it is `chat.post`, `chat.clear`, `timer.start`, `timer.pause`, `timer.reset`, `talk.assign`, `talk.end`, `talk.self`, `talk.done`, `presenter.set`, `settings.update` (for `openFacilitation`, `announceArrivals` and the talk settings) and `board.destroy`

