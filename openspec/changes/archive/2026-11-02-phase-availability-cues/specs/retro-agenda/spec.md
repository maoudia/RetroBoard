## ADDED Requirements

### Requirement: Gated controls cue
Every control disabled by a phase rule SHALL use the same visual cue and SHALL expose the reason to assistive technologies; a phase change SHALL be announced with what opened and what closed.

#### Scenario: Screen reader on phase change
- **WHEN** the facilitator moves from Write to Group
- **THEN** a polite live region announces that grouping opened and writing closed

#### Scenario: Same cue for votes and notes
- **WHEN** the Write phase is current
- **THEN** vote controls and any other gated control show the same greyed style and lock icon as a closed composer
