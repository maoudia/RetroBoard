## ADDED Requirements

### Requirement: Layout per screen class
The board SHALL remember layout choices per screen class on the device (phone, tablet, desktop, wall) and apply the profile of the current class on every board.

#### Scenario: Laptop and TV
- **WHEN** Alice widens a column on her laptop and later opens a board on the meeting-room TV in the same browser profile
- **THEN** the TV keeps its own layout and the laptop finds the wide column again

### Requirement: Reset and copy layouts
The profile SHALL let the person reset the layout of the current screen class or copy another class's layout to it.

#### Scenario: Reset
- **WHEN** Alice resets the layout on this screen
- **THEN** every remembered size for this screen class returns to its default
