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
