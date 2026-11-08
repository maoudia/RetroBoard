## MODIFIED Requirements

### Requirement: Column size
A participant SHALL be able to resize a column with predefined sizes, the mouse or the keyboard, and the size SHALL be remembered on that board; while the all-columns link is on, choosing a predefined size SHALL apply it to every column, and dragging the grip SHALL set that column only.

#### Scenario: Wide column
- **WHEN** Bob makes the Stop column wide and reloads
- **THEN** the column is still wide

#### Scenario: Linked sizes
- **WHEN** the all-columns link is on and Bob picks the wide size in the Stop column
- **THEN** every column is wide in Bob's view and no other participant's view changes

#### Scenario: Free width stays per column
- **WHEN** Bob drags the grip of the Stop column with the link on
- **THEN** only the Stop column changes width

#### Scenario: Unlinked
- **WHEN** Bob turns the link off and picks the wide size in the Stop column
- **THEN** only that column is wide
