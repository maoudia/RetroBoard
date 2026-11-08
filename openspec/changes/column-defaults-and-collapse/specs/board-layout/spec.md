## MODIFIED Requirements

### Requirement: Writing-area sizing in place
The size of a writing area SHALL be adjusted on the area itself: a segmented S M L control in the area header sets the size, dragging the grip sets the height and double-click on it resets; a link toggle beside the control makes the choice apply to every column and SHALL be on by default. The Write toolbar button SHALL only show or hide the writing areas.

#### Scenario: Resize one column
- **WHEN** a user drags the grip of one column's writing area
- **THEN** only that column's writing area changes height

#### Scenario: Apply to all
- **WHEN** a user turns on the link toggle and picks a size
- **THEN** every writing area takes the chosen size

#### Scenario: Same size for every column by default
- **WHEN** a user who never touched the link picks a size in one column
- **THEN** every writing area takes the chosen size

#### Scenario: Link turned off
- **WHEN** a user turns the link off and picks a size in one column
- **THEN** only that column's writing area changes and the link stays off on that device

#### Scenario: Existing sizes kept
- **WHEN** a participant who had sized columns one by one opens the board after the update
- **THEN** every column keeps its current size until a new size is chosen
