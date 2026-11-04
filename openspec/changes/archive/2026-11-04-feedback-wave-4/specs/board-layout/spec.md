## ADDED Requirements

### Requirement: Writing-area sizing in place
The size of a writing area SHALL be adjusted on the area itself: a segmented S M L control in the area header sets the size, dragging the grip sets the height and double-click on it resets; a link toggle beside the control makes the choice apply to every column. The Write toolbar button SHALL only show or hide the writing areas.

#### Scenario: Resize one column
- **WHEN** a user drags the grip of one column's writing area
- **THEN** only that column's writing area changes height

#### Scenario: Apply to all
- **WHEN** a user turns on the link toggle and picks a size
- **THEN** every writing area takes the chosen size
