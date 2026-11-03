# ux-calm Specification

## Purpose
Calm, icon-led controls: one foldable writing area, a consistent toolbar order, column turns (zoom one column, mask the others), and a phase clock that respects the planned total time.

## Requirements

### Requirement: The chronometer respects the global time
The phase chronometer SHALL stop when the planned time of the whole retro is used up and SHALL show that it stopped.

#### Scenario: Forgotten timer
- **WHEN** a phase runs past the time left in the whole retro
- **THEN** the clock freezes at that limit and a notice says the planned time is used up

### Requirement: Accordion positioning
In presentation mode with the accordion style, moving to a previous column SHALL scroll it fully into view with no column clipped.

#### Scenario: Backward
- **WHEN** the facilitator moves focus to the previous column on a phone
- **THEN** the focused column is fully visible

### Requirement: Calm writing area
The writing area SHALL show icons and colour instead of sentences; every control keeps an accessible name and one chevron SHALL open and close it.

#### Scenario: Reading the area
- **WHEN** a participant looks at a writing area
- **THEN** it shows the field, a few icon buttons and one chevron, and no explanatory sentence besides the placeholder

### Requirement: Icon-led buttons with intent colours
Buttons SHALL prefer an icon with an accessible label and use colour by intent: publish and add in the accent, destructive in the danger colour, the rest neutral.

#### Scenario: Compose actions
- **WHEN** the composer actions render on a 390 px screen
- **THEN** they fit on one row without visible text longer than a short word

### Requirement: Natural menu order
Toolbar icons SHALL follow one order on every screen size and the hide-menus chevron SHALL sit at the right end.

#### Scenario: Same order
- **WHEN** the toolbar renders on desktop and on a phone
- **THEN** the buttons appear in the same order and the chevron is the last item on the right

### Requirement: Rebuilt secondary bar
The secondary bar SHALL group voting state, votes left and publishing in a compact strip with icon-led controls that does not wrap on a phone.

#### Scenario: Phone
- **WHEN** the board is open on a 390 px screen
- **THEN** the strip is one row of at most 48 px

### Requirement: Column turns
The facilitator SHALL be able to open the columns one after the other; the open column is zoomed and the others are masked with their writing area disabled.

#### Scenario: One at a time
- **WHEN** the facilitator starts column turns and opens Start
- **THEN** only Start accepts writing and the other columns look disabled until the facilitator moves on

### Requirement: Stacked setting rows
Setting rows with wide controls SHALL stack under their label on narrow screens.

#### Scenario: Language on a phone
- **WHEN** the profile opens on a 390 px screen
- **THEN** the language options sit under their label and nothing overlaps
