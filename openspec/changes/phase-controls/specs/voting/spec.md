## ADDED Requirements

### Requirement: Lock on the post-it opens and closes voting
A facilitator SHALL see, on each post-it and cluster whose voting is closed by the phase, an icon-only lock button that opens voting, and, while voting is open outside the Vote phase, an icon-only button that closes it again. The buttons SHALL have no visible text, an accessible name and a tooltip, a touch target of at least 44 px on touch screens, and SHALL act as the vote capability of the running phase. Participants SHALL see no such button.

#### Scenario: Open voting from a post-it
- **WHEN** a facilitator activates the lock on a post-it during the Group phase
- **THEN** voting opens for everyone until the next phase change and the lock shows its open state

#### Scenario: Participant
- **WHEN** a participant looks at a post-it while voting is closed by the phase
- **THEN** no lock button is shown and the existing cue explains that voting is closed

#### Scenario: Screen reader
- **WHEN** a screen reader reaches the lock
- **THEN** it announces "Open voting now" or "Close voting" and the current state
