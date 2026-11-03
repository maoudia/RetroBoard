## ADDED Requirements

### Requirement: Results charts
After voting the system SHALL show the podium and charts of the top ideas, the votes per column and the vote participation, computed on the device, and SHALL show no chart while vote counts are hidden.

#### Scenario: After closing the vote
- **WHEN** the facilitator closes a vote with 24 votes cast
- **THEN** the results page shows the podium, the top ideas as bars, the share of votes per column and the number of votes used

#### Scenario: Secret vote open
- **WHEN** counts are hidden
- **THEN** the results page says results come after the vote and draws no chart

### Requirement: Accessible charts
Every chart SHALL have a text alternative listing its values.

#### Scenario: Screen reader
- **WHEN** a screen reader reaches the votes-per-column chart
- **THEN** it reads each column with its share of votes
