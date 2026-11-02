## ADDED Requirements

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
