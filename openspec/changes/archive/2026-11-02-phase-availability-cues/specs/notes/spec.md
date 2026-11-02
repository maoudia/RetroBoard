## ADDED Requirements

### Requirement: Closed composer outside writing phases
When the running agenda's current phase does not allow publishing notes for a participant, the composer SHALL be shown disabled with a lock icon, the reason, and the next phase that allows writing when there is one.

#### Scenario: Vote phase
- **WHEN** the agenda runs with rules and the Vote phase is current
- **THEN** each composer is greyed out with "Writing is closed during Vote" and its publish buttons are disabled

#### Scenario: Facilitator
- **WHEN** a facilitator capability holder looks at the same composer
- **THEN** it is enabled with the hint "Allowed for you as facilitator"

#### Scenario: No running agenda
- **WHEN** no agenda runs or phase rules are off
- **THEN** the composer is enabled as today
