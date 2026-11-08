## MODIFIED Requirements

### Requirement: Expand all in a column
Each column that has clusters SHALL offer "Expand all" and "Collapse all" when the participant has switched group collapse buttons on (off by default), switching every cluster in that column between a stacked view and an inline expanded view for the current participant; while the all-columns link is on, the choice SHALL apply to every column that has clusters.

#### Scenario: Expand all
- **WHEN** a participant clicks "Expand all" on a column with 3 clusters
- **THEN** the 3 clusters show their ideas inline in that participant's view only

#### Scenario: Off by default
- **WHEN** a participant who never switched group collapse buttons on opens a board with clusters
- **THEN** no collapse button is shown in the column headers and the clusters stay stacked

#### Scenario: Switched on in the profile
- **WHEN** the participant switches group collapse buttons on
- **THEN** the button appears in every column that has clusters

#### Scenario: Spread to all columns
- **WHEN** the link is on and the participant collapses the clusters of one column
- **THEN** the clusters of every column with clusters are collapsed in that participant's view

#### Scenario: One column only
- **WHEN** the link is off and the participant expands the clusters of one column
- **THEN** only that column's clusters expand
