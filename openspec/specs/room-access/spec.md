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
A participant SHALL be able to join a live board from the landing page with a short code approved by a facilitator, and neither the relay nor a person who knows the code SHALL be able to obtain the board key by imitating the joiner.

#### Scenario: Knock
- **WHEN** Bob enters the code shown on the shared screen and Alice approves
- **THEN** Bob opens the board and the relay only saw the code, the room id and ciphertext

#### Scenario: Imitated knock
- **WHEN** a second request arrives with the name and safety number of a pending request
- **THEN** both are refused and Alice is told that someone tried to imitate a participant

#### Scenario: Number chosen after the fact
- **WHEN** a party who read Bob's request tries to produce a request with the same safety number
- **THEN** the number of its request differs, because it depends on a value the holder chose after the request was committed

### Requirement: Move to a fresh link
The system SHALL let the facilitator move a board to a new room and key, delivering the new link only to the participants who remain, with the board's history, authors and votes unchanged.

#### Scenario: Old link
- **WHEN** a removed participant opens the old link after the move
- **THEN** the board is closed for everyone who sees the closing and empty for anyone else: the new room, its key and its events are never theirs

#### Scenario: Same board, new room
- **WHEN** the facilitator moves the team to a fresh link
- **THEN** the remaining participants open the new link with the same notes, authors and votes, sealed under a new room key, and the new link names the signing room of the first (ADR-0035)

### Requirement: The new link reaches only the remaining participants
The system SHALL seal the new link to each remaining participant's own key and sign it with the lead facilitator's key, and SHALL NOT send it to a removed participant or accept it from anyone else.

#### Scenario: Removed participant excluded
- **WHEN** the facilitator removes participant X and moves the team to a fresh link
- **THEN** every hand-off in the old room is sealed to a remaining participant's key, none opens with X's key, and X's old room key opens nothing of the new room

#### Scenario: Forged hand-off
- **WHEN** a participant who is not the lead facilitator, or someone who only holds the old room key, sends a hand-off that points to another link
- **THEN** the other participants ignore it and stay on the board

#### Scenario: Participant offline during the move
- **WHEN** a participant is not connected when the facilitator moves the team
- **THEN** they are not sent the link, their old link opens the closed room, and the facilitator is told beforehand how many people are moved so the others can be sent the link with Share
