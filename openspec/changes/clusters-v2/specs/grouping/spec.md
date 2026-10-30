## ADDED Requirements

### Requirement: Move a cluster to another column
A participant SHALL be able to move a whole cluster to another column by drag and drop or from the cluster menu; its ideas, votes and title SHALL move with it.

#### Scenario: Drag a cluster
- **WHEN** Alice drags the cluster "Slow CI" (3 ideas, 2 votes) from "Went wrong" to "To improve"
- **THEN** every participant sees the cluster in "To improve" with its 3 ideas, 2 votes and title

#### Scenario: Keyboard alternative
- **WHEN** a keyboard user opens the cluster menu and chooses "Move to column..." then "To improve"
- **THEN** the cluster moves as with drag and drop and focus stays on the cluster

#### Scenario: Locked board
- **WHEN** the board is locked
- **THEN** the move is refused and the cluster stays in place for everyone

## MODIFIED Requirements

### Requirement: Cluster title
A cluster SHALL have a title that defaults to its shortest idea cut on a word boundary (at most 40 characters), SHALL be renameable by any participant during grouping, and SHALL offer at most three title suggestions derived from its ideas, preferring phrases shared by several ideas over isolated words.

#### Scenario: Default title
- **WHEN** note "Builds take 20 minutes on every push" receives note "Slow CI"
- **THEN** the cluster is titled "Slow CI" until someone renames it

#### Scenario: Shared phrase first
- **WHEN** a cluster holds "Slow CI pipeline", "The CI pipeline fails on Fridays" and "Flaky tests"
- **THEN** the first suggestion is "CI pipeline"
