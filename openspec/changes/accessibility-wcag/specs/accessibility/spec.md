## ADDED Requirements

### Requirement: Conformance target
The site SHALL target WCAG 2.2 level AA on every page and dialog, in every theme and variant, on phones and desktops.

#### Scenario: Automated gate
- **WHEN** a pull request changes the web app
- **THEN** axe with WCAG 2.2 A and AA rules runs on every route and dialog and any violation fails the build

#### Scenario: Theme contrast
- **WHEN** a theme token makes text on a note colour fall below 4.5:1
- **THEN** the theme test fails

### Requirement: Board operable without dragging
Every result reachable by dragging (moving a note, grouping, reordering) SHALL also be reachable with a menu and the keyboard.

#### Scenario: Group without a mouse
- **WHEN** a keyboard user opens a note menu and chooses "Group with..." then a target
- **THEN** the notes are grouped as with a drag and drop

### Requirement: Status announcements
New notes, phase changes, the end of a timer and the vote reveal SHALL be announced to assistive technologies without moving focus, merged when frequent.

#### Scenario: Busy column
- **WHEN** three notes are published in Start within two seconds
- **THEN** a screen reader hears one polite message "3 new notes in Start"

### Requirement: Accessibility statement
The site SHALL publish an accessibility statement in French and English with the conformance status, known limits, the last audit date and a way to report a problem.

#### Scenario: Footer link
- **WHEN** a person follows the footer link "Accessibility"
- **THEN** the statement page opens in their language
