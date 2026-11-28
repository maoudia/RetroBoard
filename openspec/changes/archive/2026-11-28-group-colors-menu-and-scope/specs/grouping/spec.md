## ADDED Requirements

### Requirement: One open group per column
Each column SHALL be able to show one open group (cluster) panel at the same time as the other columns, the open group SHALL be personal view state per column, and opening a group SHALL only close the open group of that same column.

#### Scenario: Two columns side by side
- **WHEN** Alice opens the group "Slow CI" in "Went wrong" and then the group "Pairing" in "To improve"
- **THEN** both panels stay open, each inside its own column, and only the second one is focused

#### Scenario: Replace in the same column
- **WHEN** Alice opens another group of "Went wrong" while "Slow CI" is open there
- **THEN** "Slow CI" closes and the other group opens, and the open group of "To improve" is unchanged

#### Scenario: Escape closes one panel
- **WHEN** two panels are open and Alice presses Escape in one of them
- **THEN** only that panel closes and focus returns to its stack

#### Scenario: Group moved or dissolved
- **WHEN** an open group is dissolved, merged into another group or moved to another column
- **THEN** its panel closes; for a merge the target group opens, and for a move the group stays open in its new column

#### Scenario: Phone
- **WHEN** Bob opens a group in one column on a 360 px screen and swipes to another column
- **THEN** the first group is still open when he swipes back, and the column tab shows that a group is open there

#### Scenario: Personal only
- **WHEN** Alice opens groups in two columns
- **THEN** no other participant's view changes and no message is sent to the relay

### Requirement: Group quick-actions menu
A group stack SHALL have a three-dot menu with the same look, position and keyboard behaviour as the note menu, offering colour swatches with more shades, open, rename, create an action, move to column, merge into another group of the column, pin and freeze (facilitators) and dissolve, with the same rights as the group panel.

#### Scenario: Recolour from the stack
- **WHEN** Alice opens the three-dot menu of the group "Deploys" and picks the blue swatch
- **THEN** every non-frozen note of the group turns blue for everyone, without opening the panel

#### Scenario: Participant rights
- **WHEN** Bob, a participant, opens the menu of a group
- **THEN** pin and freeze are not offered, and on a locked board the changing entries are not offered either

#### Scenario: Keyboard
- **WHEN** a keyboard user tabs to the menu button of a group, presses Enter and uses the arrow keys
- **THEN** each entry is reachable, Escape closes the menu and focus returns to the button

#### Scenario: Parity with the panel
- **WHEN** an action is available in the group panel footer
- **THEN** the same action, with the same label, is available in the menu, and the other way round

#### Scenario: Voted group
- **WHEN** Alice chooses Dissolve on a group that has votes
- **THEN** she is asked to confirm before the group is dissolved
