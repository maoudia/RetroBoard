## ADDED Requirements

### Requirement: Own name in the participants list
The participants menu SHALL show my own name on my row even when I stay anonymous for the others, and SHALL say that the others see "Anonymous". It SHALL NOT announce "0 person(s)" in direct mode when nobody else is connected.

#### Scenario: Alone with a name
- **WHEN** Moncef, who set a name but hides it from others, opens the participants menu alone on a board
- **THEN** his row shows "Moncef" with the note that others see "Anonymous", and the direct line shows the idle text

### Requirement: Stack preview shows what it has
Resting the pointer on a stack SHALL list up to eight of its notes, then a "+N more" line, and the preview SHALL be positioned from its real height.

#### Scenario: Eleven notes
- **WHEN** a stack of eleven notes is previewed
- **THEN** eight notes and "+3 more" are visible and nothing is clipped

### Requirement: Cards keep their content
The footer of a note and the badge row of a stack SHALL wrap so that author, Pinned, Frozen, actions, vote and menu stay inside the card at any width.

#### Scenario: Pinned and frozen note on a phone
- **WHEN** a pinned and frozen note with a vote is shown at 360 px
- **THEN** every footer control lies inside the note box

### Requirement: Stable creation switch
The Simple / Advanced switch of the creation page SHALL keep the same position in both modes.

#### Scenario: Toggle
- **WHEN** the person switches from Simple to Advanced
- **THEN** the switch does not move

### Requirement: Correct follow links
The follow links SHALL point to the profiles listed on https://www.maoudia.com/.

#### Scenario: Footer links
- **WHEN** the feedback block is shown
- **THEN** GitHub, LinkedIn, X and DEV.to point to the aoudiamoncef profiles

### Requirement: One-row step progress with a visible entry point
The phase stepper SHALL use one row: the phase and its time, the segmented bar, and an info button that lists every step with its time. A finished agenda SHALL be shown by a check mark, not by a text line.

#### Scenario: Phone
- **WHEN** the board is shown at 360 px
- **THEN** the stepper takes one row and the info button opens the list of steps

### Requirement: One size control
The writing area size and the column width SHALL use the same component, with equal cells.

#### Scenario: Column width
- **WHEN** the column width menu opens
- **THEN** its choices are equal cells of the same look as the writing size

### Requirement: Movable chat bubble
The minimised chat bubble SHALL be draggable anywhere on the screen, SHALL remember its place on the device, and SHALL have its own close button.

#### Scenario: Move and close
- **WHEN** the person drags the bubble away from the add-idea button, then closes it
- **THEN** the bubble stays where dropped until closed, and the add-idea button is reachable
