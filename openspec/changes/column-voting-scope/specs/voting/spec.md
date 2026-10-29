## ADDED Requirements

### Requirement: Votable columns
Votes SHALL only be possible on columns marked votable.

#### Scenario: Happy column
- **WHEN** Bob tries to vote on a note in "What went well" that is not votable
- **THEN** there is no vote button and the fold refuses the vote
