## ADDED Requirements

### Requirement: A note can carry an estimate badge
A note that has an estimate, or has been parked or marked to split, SHALL show a badge in its footer with the card's label or the flag's glyph, visible to everyone in every phase and on every screen class, with an accessible name that says "Estimate", "Parked" or "To split". The estimate SHALL be stored by the note's id in the board, not written into the note's text, and SHALL survive an edit of the text.

#### Scenario: Badge after a decision
- **WHEN** the moderator decides 5 for a ticket
- **THEN** every participant sees a badge 5 in that note's footer, and a screen reader reads "Estimate: 5"

#### Scenario: Edit keeps it
- **WHEN** a facilitator edits the text of the ticket
- **THEN** the badge is unchanged

#### Scenario: Deleted note
- **WHEN** a ticket note is deleted
- **THEN** its badge is gone and its estimate is not exported

#### Scenario: Imported estimate
- **WHEN** a ticket was imported with an existing estimate and no round has decided yet
- **THEN** the badge reads "was 5" in a muted style until a round decides

#### Scenario: Footer fit
- **WHEN** a note has an estimate, is pinned, and has actions made from it
- **THEN** the footer wraps its badges inside the card on a 360 px screen and nothing overflows

### Requirement: Estimates are changed by facilitators and logged
Only the lead and the co-facilitators SHALL set, replace or clear an estimate, each change SHALL be an event of the log, and the activity feed SHALL list it with who made it and which ticket.

#### Scenario: Activity
- **WHEN** a facilitator decides 5 on PROJ-123
- **THEN** the activity feed shows that they set 5 on PROJ-123

#### Scenario: A participant cannot
- **WHEN** a participant sends an estimate for a note
- **THEN** every replica ignores it
