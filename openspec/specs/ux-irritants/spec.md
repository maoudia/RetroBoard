# ux-irritants Specification

## Purpose
Everyday UX friction fixes: confirmations, responsive grouping, phone columns and sliders, folding chrome, joining, consistent bars and readable durations.

## Requirements

### Requirement: Confirm deleting a pinned note
Deleting a pinned note SHALL ask for confirmation first.

#### Scenario: Delete a pinned note
- **WHEN** Alice chooses delete on a pinned note
- **THEN** a confirmation dialog opens and the note stays until she confirms

### Requirement: Group similar ideas stays responsive
Grouping similar ideas SHALL not freeze the page, on any column size, and SHALL end with a visible notification.

#### Scenario: Nothing to group
- **WHEN** the facilitator groups similar ideas on empty or all-different columns
- **THEN** the page stays usable and a notification says that nothing was found

### Requirement: Column width on phones
The column width menu SHALL change the column width on phones and a narrow column SHALL let the next column peek.

#### Scenario: Narrow on a phone
- **WHEN** Bob chooses Narrow on a 390 px screen
- **THEN** the column is narrower than the screen and the edge of the next column is visible

### Requirement: Column slider hint
On phones the column slider SHALL sit at the top, be thin and show the number of columns and the current one.

#### Scenario: Several columns
- **WHEN** a board has four columns
- **THEN** four indicators show and the current one is highlighted

### Requirement: No overlapping controls on phones
Phone controls SHALL use an icon with a short label and SHALL not overlap each other.

#### Scenario: Presentation menu
- **WHEN** the presentation menu is open on a 390 px screen
- **THEN** no button overlaps another

### Requirement: Per-column writing area
The writing area SHALL be hideable per column with a smooth vertical slide.

#### Scenario: Hide in one column
- **WHEN** Alice hides the writing area of one column
- **THEN** only that column slides it away and the choice is kept on the device

### Requirement: Toolbar slide and handle
The toolbar SHALL hide and show with a smooth slide and keep a chevron handle visible.

#### Scenario: Hide the toolbar
- **WHEN** Alice taps the chevron
- **THEN** the toolbar slides away and the chevron stays to bring it back

### Requirement: Presentation menu bar default
Board creation SHALL offer to hide the menu bar in presentation mode, on by default.

#### Scenario: Default
- **WHEN** a facilitator creates a board without touching the option
- **THEN** presentation mode hides the menu bar

### Requirement: Joining is explained and fast
The share dialog SHALL show the QR code quickly and explain the three ways to join.

#### Scenario: Open share
- **WHEN** Alice opens the share dialog
- **THEN** the QR code is drawn within 300 ms and the text explains scan, link and code

### Requirement: Consistent bars and readable overdue
The vote bar and phase bar SHALL share one button style and an overdue time SHALL be shown as a human duration.

#### Scenario: Very late phase
- **WHEN** a phase is 10949 minutes over its time
- **THEN** the label reads about 7 days late

### Requirement: Buttons keep their text inside
A button SHALL show its whole label inside its box at any width and SHALL not shrink below its content.

#### Scenario: Destroy on a phone
- **WHEN** the board options are open on a 390 px screen
- **THEN** the text of the Destroy button is fully inside the button

### Requirement: Compact segmented controls
The Simple / Advanced switch and the display scale choices SHALL be compact segmented controls with visible icons; the mode switch SHALL be centred and not stretch to the container width.

#### Scenario: Mode switch in a dialog
- **WHEN** a dialog shows the Simple / Advanced switch
- **THEN** it is centred and narrower than the dialog

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
