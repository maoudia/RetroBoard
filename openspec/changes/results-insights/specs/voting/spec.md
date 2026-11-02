## ADDED Requirements

### Requirement: Results insights
The results page SHALL show charts of votes per idea, per column and their spread, participation counts and plain-language insights computed in the browser.

#### Scenario: Concentrated votes
- **WHEN** three ideas received 60% of the votes
- **THEN** the results page says that three ideas took 60% of the votes

### Requirement: Podium layout
The podium SHALL place the first, second and third ranks as a podium, with tied ideas side by side on the same step.

#### Scenario: Tie for second
- **WHEN** two ideas tie for second place
- **THEN** both stand on the second step and the next idea is third
