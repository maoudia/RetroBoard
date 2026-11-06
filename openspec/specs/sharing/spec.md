# sharing Specification

## Purpose
Makes inviting a team to a board a single, safe gesture on any device, without link shorteners or stored invitations.

## Requirements

### Requirement: One-gesture invite
The system SHALL show the facilitator a share panel when a new board opens, with a primary action that copies the participant invite link.

#### Scenario: First share
- **WHEN** a facilitator creates a board
- **THEN** the share panel is open and one click copies the participant link (without the facilitator secret)

### Requirement: Invite templates
The system SHALL provide ready-to-paste invite messages for chat and email in the current language, keeping the passcode out of the message and offering to copy it separately.

#### Scenario: Slack invite with passcode
- **WHEN** the facilitator copies the chat invite of a passcode-protected board
- **THEN** the copied text contains the link and the retro title but not the passcode

### Requirement: QR join
The system SHALL display a locally generated QR code of the participant link, and the QR code MUST NOT contain the facilitator secret.

#### Scenario: Scan in the room
- **WHEN** a participant scans the QR code
- **THEN** the board opens on their phone

### Requirement: Room confirmation words
The system SHALL show the same three-word room code to every participant of a board so people can confirm they are in the same retro.

#### Scenario: Same board
- **WHEN** two participants open the same board
- **THEN** they see the same three words

### Requirement: Simple sharing
In simple mode the share dialog SHALL show the link, the copy button, the QR code and the room words, and keep chat and email templates, passcode, facilitator link and privacy notes under Advanced.

#### Scenario: Simple share
- **WHEN** Alice opens the share dialog in simple mode
- **THEN** she sees the link, Copy, the QR toggle and the room words, and an "Advanced" switch for the rest

### Requirement: Facilitator link card
The share panel SHALL show the facilitator link in its own card, visible to the facilitator only, with a copy button, a warning about who should receive it, and a way to hand over to a connected participant.

#### Scenario: Facilitator opens Share
- **WHEN** the facilitator opens the share panel
- **THEN** the participant link and the facilitator link card are both visible without expanding anything

### Requirement: Plain connection explanation
The participants menu SHALL explain whether a person is connected directly or through the relay with plain words and distinct icons.

#### Scenario: Relay
- **WHEN** a connection goes through the relay
- **THEN** the menu shows the relay icon and a short non-technical sentence

### Requirement: Short board links
Board links SHALL use the `/boards/` path and the compact encoding, and links in the previous format SHALL keep opening the board.

#### Scenario: Old link
- **WHEN** a participant opens a link shared last month
- **THEN** the board opens

### Requirement: Explained room words
The room words SHALL be shown with a short explanation of their purpose.

#### Scenario: Share panel
- **WHEN** a facilitator opens the share panel
- **THEN** the words are labelled as board words to read aloud

### Requirement: Join with a short code
The landing join field SHALL accept a link, a short board code or the room words, and a participant online on the board SHALL be able to let the person in; the key is sealed to the joiner and never seen by the relay.

#### Scenario: Join from the TV code
- **WHEN** Bob types the code shown on the presenter screen in the landing join field and Alice, online on the board, accepts
- **THEN** Bob's browser receives the sealed link and opens the board

#### Scenario: Nobody online
- **WHEN** Bob enters a valid code while nobody holding the board is online
- **THEN** the screen says that someone from the board must be online and suggests asking for the link
