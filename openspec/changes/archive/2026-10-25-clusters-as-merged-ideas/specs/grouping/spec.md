## ADDED Requirements

### Requirement: Cluster title
A cluster SHALL have a title that defaults to the text of its first idea, SHALL be renameable by any participant during grouping, and SHALL offer title suggestions derived from its ideas.

#### Scenario: Default title
- **WHEN** note "Slow CI" receives note "Builds take 20 min"
- **THEN** the cluster is titled "Slow CI" until someone renames it

### Requirement: Cluster as an idea
A cluster SHALL be treated as one idea for voting, ranking and action creation.

#### Scenario: Action from a cluster
- **WHEN** the facilitator creates an action from the top-ranked cluster
- **THEN** the action references the cluster title

### Requirement: Expand all in a column
Each column SHALL offer "Expand all" and "Collapse all", switching every cluster in that column between a stacked view and an inline expanded view for the current participant.

#### Scenario: Expand all
- **WHEN** a participant clicks "Expand all" on a column with 3 clusters
- **THEN** the 3 clusters show their ideas inline in that participant's view only

### Requirement: Merge clusters
Dropping a cluster onto another cluster of the same column SHALL merge them, keeping the target's title.

#### Scenario: Merge
- **WHEN** a cluster of 2 is dropped on a cluster of 3
- **THEN** one cluster of 5 remains with the target's title
