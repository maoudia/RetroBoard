## ADDED Requirements

### Requirement: Remove a participant
The facilitator SHALL be able to remove a participant from the session, and SHALL be offered to move the team to a fresh link that the removed participant does not receive.

#### Scenario: Joined by mistake
- **WHEN** the facilitator removes participant X and chooses "Move the team to a fresh link"
- **THEN** X leaves the board and sees a page that says they were removed, everyone else continues on a new link with the same content, and X's link opens no board

#### Scenario: Remove only
- **WHEN** the facilitator removes participant X without moving the team
- **THEN** X leaves the board and their notes stop being accepted, and everybody else stays on the same link

#### Scenario: Only the facilitator
- **WHEN** a participant opens the participants menu
- **THEN** they are not offered the removal of anybody

### Requirement: Rename a participant
The facilitator SHALL be able to set a participant's display name on the board, shown with a hint that the facilitator edited it.

#### Scenario: Anonymous participant
- **WHEN** the facilitator renames "Anonymous" to "Sam"
- **THEN** everyone sees Sam with an "edited by the facilitator" hint

### Requirement: Reveal all drafts
The facilitator SHALL be able to start a short countdown after which every participant's drafts are published, except drafts the participant chose to keep private.

#### Scenario: Reveal moment
- **WHEN** the facilitator clicks "Reveal all" and Bob marks one draft "keep private"
- **THEN** after 5 seconds all drafts appear on the board except Bob's private one
