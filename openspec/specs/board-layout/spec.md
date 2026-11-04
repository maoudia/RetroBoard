# board-layout Specification

## Purpose
How a board is laid out for each person and for the room: foldable and resizable writing area, draggable column widths, shared post-it and text scale.

## Requirements

### Requirement: Hide the writing area
The board SHALL offer a toggle that collapses every writing area to a handle and restores it.

#### Scenario: Reading only
- **WHEN** Alice hides the writing area during the discussion
- **THEN** each column shows only its notes and a Write handle that reopens it

### Requirement: Resize by dragging
A column and the writing area SHALL be resizable by dragging their edge, by touch and with the keyboard; a preset restores a standard width.

#### Scenario: Wider column
- **WHEN** Alice drags the edge of the Stop column
- **THEN** the column keeps the new width until she picks a preset

### Requirement: Shared board display
The facilitator SHALL set the post-it size, notes per row and text size for the board, and every participant SHALL see that display.

#### Scenario: Bigger notes for the room
- **WHEN** the facilitator picks large post-its
- **THEN** every participant's board shows large post-its

### Requirement: Writing-area sizing in place
The size of a writing area SHALL be adjusted on the area itself: a segmented S M L control in the area header sets the size, dragging the grip sets the height and double-click on it resets; a link toggle beside the control makes the choice apply to every column. The Write toolbar button SHALL only show or hide the writing areas.

#### Scenario: Resize one column
- **WHEN** a user drags the grip of one column's writing area
- **THEN** only that column's writing area changes height

#### Scenario: Apply to all
- **WHEN** a user turns on the link toggle and picks a size
- **THEN** every writing area takes the chosen size

### Requirement: Neutral writing-size control
The writing-size control SHALL use three neutral squares of growing size, with no accent colour, and the same-size-for-all toggle SHALL use a columns icon.

#### Scenario: Pick a size
- **WHEN** the user picks the large square
- **THEN** it is the pressed one and the writing area grows
