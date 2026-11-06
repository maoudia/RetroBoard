# room-access Specification

## Purpose
Protects every board so that only people holding the link (and the passcode, when set) can read or change it, and so that the service itself cannot read board content.

## Requirements

### Requirement: Fragment key
The system MUST generate a random 256-bit room key for each board and MUST carry it only in the URL fragment of invitation links, so it is never sent to the server.

#### Scenario: Key not sent to the server
- **WHEN** a participant opens an invitation link
- **THEN** no HTTP request or WebSocket message sent by the browser contains the room key

### Requirement: Encrypted events
The system MUST encrypt and authenticate every board event in the browser before it leaves the device, binding the ciphertext to the room, the event id and its clock value.

#### Scenario: Relay observes ciphertext only
- **WHEN** a note "Deploy on Fridays" is published
- **THEN** the relay receives an envelope whose payload does not contain the note text in any encoding

#### Scenario: Tampered event
- **WHEN** an envelope is modified or replayed into another room
- **THEN** every participant rejects it and the board state is unchanged

### Requirement: Optional passcode
The system SHALL let the facilitator set a passcode at creation; participants MUST then provide both the link and the passcode to read the board.

#### Scenario: Wrong passcode
- **WHEN** a person opens the link and enters a wrong passcode
- **THEN** the board content is not shown and the person can retry

### Requirement: Facilitator capability
The system MUST accept privileged events (settings, phases, vote reveal, role delegation, agent invitations) only when signed with the board's facilitator key or a delegated co-facilitator key.

#### Scenario: Participant forges a phase change
- **WHEN** a participant without the facilitator key sends a "start voting" event
- **THEN** every participant ignores it

### Requirement: Authorship
The system MUST sign each participant's events with a per-session key and MUST accept edits and deletions of a note only from the key that published it.

#### Scenario: Edit by someone else
- **WHEN** a participant sends an edit for a note published by another session key
- **THEN** every participant ignores the edit

### Requirement: Passcode by default
The creation form SHALL propose a generated passcode by default, placed right under the board title in simple and advanced modes, and the person SHALL be able to regenerate it or type their own.

#### Scenario: New board
- **WHEN** Alice opens the creation form
- **THEN** a readable passcode is already filled in under the title and she can regenerate, reveal, copy or replace it

### Requirement: Passcode generator
In advanced mode the creation form SHALL offer a generator with length, character classes, look-alike exclusion and a passphrase mode, and SHALL show the estimated strength in bits.

#### Scenario: Long passphrase
- **WHEN** Alice picks a passphrase of 6 English words separated by dashes
- **THEN** the field holds 6 words joined by dashes and the meter shows more than 60 bits

### Requirement: No passcode is an informed choice
Creating a board without a passcode SHALL require an explicit confirmation that states the risks, and the board content SHALL remain end-to-end encrypted with the link key.

#### Scenario: Opt out
- **WHEN** Alice clears the passcode and creates the board
- **THEN** a confirmation explains that anyone holding the link can read and write the board, and the board is created only if she confirms

### Requirement: Remembered passcode
A passcode entered or created on a device SHALL be remembered with the local copy of the board, so the board reopens on that device without asking again until the copy expires or is forgotten.

#### Scenario: Reopen
- **WHEN** Bob joined with the passcode yesterday and reopens the link on the same browser
- **THEN** the board opens without the passcode prompt

### Requirement: Shield for encryption state
The encryption state SHALL be shown as a shield icon, with the explanation available on hover, focus and tap, instead of a long sentence.

#### Scenario: Explanation on demand
- **WHEN** a user taps the shield
- **THEN** a short explanation of the protection (or its absence) is shown

### Requirement: Join by code
A participant SHALL be able to join a live board from the landing page with a short code approved by a facilitator, without the relay ever receiving the board key.

#### Scenario: Knock
- **WHEN** Bob enters the code shown on the shared screen and Alice approves
- **THEN** Bob opens the board and the relay only saw the code, the room id and ciphertext
