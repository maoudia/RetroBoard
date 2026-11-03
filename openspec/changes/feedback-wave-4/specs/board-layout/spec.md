## ADDED Requirements

### Requirement: Writing-area sizing in place
The size of a writing area SHALL be adjusted on the area itself: dragging its top edge sets the height, a size chip cycles the text size, and double-click resets; one choice in the Display popover applies the size to all columns. The Write toolbar button SHALL only show or hide the writing areas.

#### Scenario: Resize one column
- **WHEN** a user drags the top edge of one column's writing area
- **THEN** only that column's writing area changes height

#### Scenario: Apply to all
- **WHEN** a user chooses "Apply to all columns" in the Display popover
- **THEN** every writing area takes the chosen size
