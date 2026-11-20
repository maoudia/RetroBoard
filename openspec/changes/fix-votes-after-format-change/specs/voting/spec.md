## ADDED Requirements

### Requirement: Counted, shown and votable agree
An idea (a note or a cluster) SHALL show a vote count and a vote control, SHALL be accepted by the vote command and SHALL appear in the results and the ranking, exactly when its column is votable. This SHALL hold after any change of format, column edit or move that changes which column holds the idea. Votes already cast SHALL stay in the log and SHALL count again when the idea is in a votable column.

#### Scenario: Format change into a non-votable column
- **WHEN** a board with voted ideas changes to a format whose matching column is not votable and the notes are kept
- **THEN** those ideas show no count and no vote control, and are absent from the results, and nothing is shown that the results do not include

#### Scenario: The column becomes votable again
- **WHEN** the column is edited to be votable or the idea moves to a votable column
- **THEN** the idea shows its earlier votes, can be voted and appears in the results with them

#### Scenario: Clusters
- **WHEN** a cluster sits in a column that is not votable
- **THEN** the cluster shows no count and the notes inside it follow the same rule

#### Scenario: Vote limit
- **WHEN** some of a person's votes are on ideas that are not counted
- **THEN** only the counted votes use up that person's vote limit

#### Scenario: The facilitator is told
- **WHEN** a facilitator confirms a format change that sets votes aside
- **THEN** the confirmation states how many votes are set aside because their column is not votable in the new format

#### Scenario: Secret voting
- **WHEN** voting is secret or sealed
- **THEN** no count is shown or ranked for an idea in a non-votable column and the hidden-count rules are unchanged
