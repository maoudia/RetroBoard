## ADDED Requirements

### Requirement: Column focus
In presenter mode the facilitator SHALL be able to focus one column, shown enlarged in the centre or as an accordion, and move the focus with the arrow keys.

#### Scenario: Focus Stop
- **WHEN** the facilitator focuses the Stop column
- **THEN** it is enlarged in the centre and the other columns are smaller around it

### Requirement: Note spotlight
The facilitator SHALL be able to spotlight one note on the shared screen.

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
