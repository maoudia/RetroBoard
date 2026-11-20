## ADDED Requirements

### Requirement: The Group with list stays inside its menu
The "Group with..." list of the note menu SHALL keep every row and its "Group N" button inside the menu panel at every viewport from 360 px to 2560 px, SHALL wrap long labels without leaving the panel or distorting the row shape, SHALL scroll inside the panel when it holds many ideas, and SHALL keep the button visible and reachable by keyboard.

#### Scenario: Many ideas on a phone
- **WHEN** a participant opens "Group with..." on a 360 px wide screen in a column of 30 ideas
- **THEN** the list scrolls inside the panel, no row crosses the panel edge, there is no horizontal scroll and the "Group N" button stays visible

#### Scenario: A very long label
- **WHEN** an idea of 200 characters without a space is in the list
- **THEN** its row wraps inside the panel and keeps a rounded rectangle shape

#### Scenario: Keyboard
- **WHEN** a participant tabs through the list
- **THEN** every row and the button receive focus in order and none is covered by the panel's fade
