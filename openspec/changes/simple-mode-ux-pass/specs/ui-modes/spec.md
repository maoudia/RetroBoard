## ADDED Requirements

### Requirement: Simple mode is small and bounded
Simple mode SHALL show at most four control groups plus the create action on the creation page, at most six visible groups plus one collapsed destructive disclosure in the board options, at most seven rows in the profile, and at most nine buttons in view on the board toolbar, and these budgets SHALL be enforced by an automated test.

#### Scenario: Creation page
- **WHEN** a facilitator in simple mode opens the creation page
- **THEN** she sees the title, the theme, the format and the timed agenda switch, and the create button

#### Scenario: Board options
- **WHEN** a facilitator in simple mode opens the board options
- **THEN** she sees Retro, Votes, Access and Columns and format, and "Reset and delete" collapsed

#### Scenario: A control is added to simple mode
- **WHEN** a change adds a seventh row to the simple profile
- **THEN** the budget test fails naming the surface and the rows

#### Scenario: Nothing lost
- **WHEN** a user switches to advanced mode
- **THEN** every setting of the catalogue is reachable and keeps the value it had

### Requirement: Settings are classified by a rubric
Every setting and control SHALL be classified essential, occasional or expert from a recorded rubric, and only essential ones SHALL be shown in simple mode.

#### Scenario: A personal comfort setting
- **WHEN** the catalogue lists the profile density option
- **THEN** it is classified expert and shown in advanced mode only

### Requirement: A first board in three interactions
A facilitator SHALL be able to create a working board from the landing page using only defaults in at most three interactions, with the theme and format preselected, a timed agenda on and an automatic password.

#### Scenario: Defaults only
- **WHEN** a new visitor opens Create and presses Create without touching any field
- **THEN** a board with a password and a timed agenda opens after she enters her name

### Requirement: One-click escape hatch between modes
Every simple surface SHALL end with a button that shows all options in place, and advanced mode SHALL offer a button back to simple, without closing the dialog or losing any value, announcing the change to assistive technology and remembering the choice on the device.

#### Scenario: Show all options
- **WHEN** a facilitator presses "Show all options" in the open board options
- **THEN** the dialog stays open, the advanced groups appear, focus moves to the first new group and a polite announcement says how many options were added

#### Scenario: Remembered
- **WHEN** she reloads the page
- **THEN** the mode is still advanced

#### Scenario: Back to simple
- **WHEN** she presses "Back to simple"
- **THEN** the advanced groups disappear and the values she set keep applying

### Requirement: Search in advanced mode
In advanced mode the board options and the profile SHALL offer a search field that filters settings by label and hint, ignoring case and accents.

#### Scenario: Find by name
- **WHEN** a user types "densite" in the profile search
- **THEN** only the density setting and its group heading remain

#### Scenario: No match
- **WHEN** she types a word that matches nothing
- **THEN** "No setting matches" is shown with a button that clears the search

#### Scenario: Landmark and count
- **WHEN** the search has results
- **THEN** a polite live region announces the number of matching settings

### Requirement: Settings follow wording and layout rules
Labels SHALL be sentence case and verb-led when they act, hints SHALL be one line of at most 90 characters stating the consequence, simple mode SHALL contain no technical vocabulary, and every text SHALL fit at 360 px in French and English.

#### Scenario: Pseudo-locale
- **WHEN** the overflow test runs on the simple surfaces
- **THEN** no label or hint overflows at 360 px

### Requirement: A collapsed Reset and delete
Destructive board actions SHALL be grouped last and collapsed by default in simple mode, each still asking for confirmation.

#### Scenario: Opening the disclosure
- **WHEN** a facilitator opens "Reset and delete"
- **THEN** she sees reset votes, reset clock, reset board and delete the board, and each asks for confirmation

### Requirement: Secondary board tools in a More menu
In simple mode the board toolbar SHALL keep share, people, actions, chat, present, export, options, undo and profile in view and SHALL move history, redo, filter, activity, writing, the boards switcher and the light or dark toggle into a More menu, provided a usability check shows it is no slower than the current toolbar; advanced mode SHALL be unchanged.

#### Scenario: More menu
- **WHEN** a participant in simple mode opens More
- **THEN** she finds history, redo, filter, activity, writing, boards and light or dark, each with its label

#### Scenario: Advanced unchanged
- **WHEN** the same participant switches to advanced
- **THEN** every toolbar button is in view as today
