## ADDED Requirements

### Requirement: A solo board follows the rules of a shared board
A solo board SHALL apply exactly the rules, limits and phase behaviour of a shared board; the only differences SHALL be the absence of other participants and of a network, and they SHALL be the declared ones: no invitation link, code or QR until the board is made shareable, no passcode field at creation, no peer-to-peer or relay status, no name nudge.

#### Scenario: Same vote rules
- **WHEN** the same sequence of votes is played on a solo board and on a shared board with one participant
- **THEN** both accept and refuse the same votes with the same reasons

#### Scenario: Parity matrix
- **WHEN** a board feature behaves differently in solo and the difference is not in the declared list
- **THEN** the parity matrix test fails

### Requirement: The relay budgets apply in solo
The in-tab relay of a solo board SHALL refuse frames the real relay would refuse (size, rate) with the same error codes.

#### Scenario: Oversized frame
- **WHEN** a solo board sends a frame larger than the relay's frame limit
- **THEN** the in-tab relay answers with the same error as the real relay and the board shows the same notice

### Requirement: A solo board stays solo until its owner converts it
A board marked solo SHALL stay marked for as long as its local replica exists and SHALL NOT connect to the real relay until its owner chooses "Make this board shareable".

#### Scenario: Many solo boards
- **WHEN** a person has created 60 solo boards and reopens the first one
- **THEN** it is still a solo board and nothing about it is sent to the relay

### Requirement: Making a solo board shareable
The Share action of a solo board SHALL offer "Make this board shareable": it explains that the board stays end-to-end encrypted and cannot go back to solo, and then shows the normal invitation. A passcode cannot be added at that point: it derives the content key, so the events already written would become unreadable.

#### Scenario: Convert
- **WHEN** Alice presses Share on a solo board, accepts
- **THEN** the board connects to the relay, the invitation link and the join code appear, and a second browser opening the link sees the board

#### Scenario: No dead link
- **WHEN** Alice presses Share on a solo board
- **THEN** no invitation link that cannot work is shown

### Requirement: Solo status text
In a solo board the participants panel SHALL say that only the owner is here and SHALL NOT show relay or peer-to-peer status.

#### Scenario: Participants panel
- **WHEN** Alice opens the participants panel of a solo board
- **THEN** it shows her alone and no connection mode

### Requirement: Carry-over from a solo board
Actions SHALL be carried over from a previous solo board by reading its local replica.

#### Scenario: Previous solo retro
- **WHEN** Alice creates a board and picks her previous solo board as the source of open actions
- **THEN** the open actions of that board are listed without any network connection
