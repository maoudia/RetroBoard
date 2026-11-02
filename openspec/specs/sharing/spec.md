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
