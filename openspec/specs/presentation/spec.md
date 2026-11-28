# presentation Specification

## Purpose
Presenter mode: the facilitator walks the room through the board, column by column, on a shared screen.

## Requirements

### Requirement: Column focus
In presenter mode the facilitator SHALL be able to focus one column, shown enlarged in the centre or as an accordion, and move the focus with the arrow keys.

#### Scenario: Focus Stop
- **WHEN** the facilitator focuses the Stop column
- **THEN** it is enlarged in the centre and the other columns are smaller around it

### Requirement: Note spotlight
The facilitator SHALL be able to spotlight one note on the shared screen, using the same enlarged view that every participant can open locally as a zoom.

#### Scenario: Discuss one idea
- **WHEN** the facilitator spotlights a note
- **THEN** the note is enlarged and the rest of the board is dimmed

#### Scenario: Move between ideas
- **WHEN** a note is spotlighted and the facilitator presses an arrow key
- **THEN** the previous or next idea of the same column is spotlighted and Escape closes the spotlight

### Requirement: Laser pointer
The presenter SHALL be able to turn on a laser pointer that every participant sees as a red dot on the column or note being pointed at, peer to peer only, even when the viewer or the presenter hides ordinary pointers. Turning it off, or leaving presenter mode, removes it.

#### Scenario: Pointing during a discussion
- **WHEN** Alice presents with her ordinary pointer shared off and turns the laser on, then moves over a note
- **THEN** Bob sees a laser dot on that note, and it disappears when Alice turns the laser off

### Requirement: Presenter space
In presenter mode the focused column SHALL use wide notes, and an idea longer than 110 characters SHALL take the whole row and wrap in a readable line length.

#### Scenario: Long idea on a wide screen
- **WHEN** a long idea is shown in the focused column
- **THEN** it spans the row instead of a narrow strip

### Requirement: Walk-through keeps the board visible
The voted-ideas walk-through SHALL NOT dim or hide the board: the idea in turn is ringed in place and shown in a dock, and a control SHALL return to the most voted idea.

#### Scenario: Step through the ranking
- **WHEN** the presenter starts the walk-through
- **THEN** the first idea is ringed on the board and the other ideas stay visible

### Requirement: Groups shown in presentation
Presentation mode SHALL show the ideas of each group by default, with a board setting to turn it off.

#### Scenario: Present a group
- **WHEN** a group is presented
- **THEN** its ideas are listed

### Requirement: Zoom on a note
Any participant SHALL be able to open a note of the board enlarged, in the same view as the presenter's spotlight, with a double tap or double click on the note, with the "Zoom" item of its 3-dot menu, or with the `z` key on a focused note. The zoom SHALL be local to the device, read-only, and SHALL NOT change the board or send any event.

#### Scenario: Double tap on a phone
- **WHEN** a participant double taps a note on a phone
- **THEN** the note opens enlarged over a dimmed board with its column name, its full text, the position "3 of 7", previous and next buttons and a close button

#### Scenario: Same view as the presenter
- **WHEN** the zoom is open outside presentation mode
- **THEN** it shows the same card as the spotlight of presentation mode and nobody else sees it

#### Scenario: Move and close
- **WHEN** the zoom is open and the participant presses an arrow key, taps next, presses Escape or taps outside the card
- **THEN** the previous or next idea of the column is shown, or the zoom closes and the focus returns to the note it came from

#### Scenario: Gestures that must not zoom
- **WHEN** a participant drags a note, long presses it, double taps its vote button, its 3-dot menu or a note being edited
- **THEN** no zoom opens and the drag, the vote, the menu and the editing work as before

#### Scenario: A single tap is not delayed
- **WHEN** a participant taps a control of a note once
- **THEN** it reacts at once, without waiting for a possible second tap

#### Scenario: Cluster
- **WHEN** a participant double taps the stack of a cluster
- **THEN** the zoom opens on its first idea with the cluster title, and next and previous step through the ideas of the cluster

#### Scenario: The note disappears
- **WHEN** the zoomed idea is deleted or unpublished by someone else
- **THEN** the zoom shows the neighbouring idea, or closes with a notice when it was the last one

#### Scenario: Hidden content
- **WHEN** a note is in a column hidden by the facilitator or masked outside the column in turn
- **THEN** it cannot be zoomed

#### Scenario: Accessibility and motion
- **WHEN** the zoom opens outside presentation mode
- **THEN** it is a modal dialog with a focus trap, announces its position in the live region, meets contrast and 44 px touch targets, and has no opening animation under reduced motion
