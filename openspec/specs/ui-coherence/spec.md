# ui-coherence Specification

## Purpose
One visual language across the app: shared button, layout and menu rules enforced by tests.

## Requirements

### Requirement: One button shape
Every button, icon button and segmented control SHALL use the pill radius token.

#### Scenario: Audit
- **WHEN** the design-token test scans the components
- **THEN** no button style declares another radius

### Requirement: Centred labels
Text and icon buttons SHALL centre their content horizontally and vertically.

#### Scenario: Measured
- **WHEN** the layout test measures the buttons of the home, creation and board pages
- **THEN** each label centre is within 1.5 px of its button centre on both axes

### Requirement: Menus ordered by importance
The toolbar, invite, export and voting menus SHALL follow the order documented in the design system, the most used action first and destructive actions last.

#### Scenario: Export menu
- **WHEN** Alice opens the export menu
- **THEN** the first entry is the most used export and deleting or resetting actions come last

### Requirement: Voting bar on small screens
On screens narrower than 600 px the voting bar SHALL stay on one line and scroll horizontally.

#### Scenario: Phone
- **WHEN** Alice votes on a 360 px wide phone
- **THEN** the voting bar takes one line and the columns keep their space

### Requirement: One toggle component
Every on/off setting in the application SHALL use the same toggle component with a label and, where useful, an icon and a description.

#### Scenario: Voting and layout toggles look alike
- **WHEN** a user compares the secret-vote toggle and a layout toggle
- **THEN** both use the same switch, size and states

### Requirement: No full-screen hiding for a review aid
A presenter review aid SHALL NOT dim or hide the content it is about when a non-modal dock can carry it.

#### Scenario: Walk-through
- **WHEN** the walk-through is running
- **THEN** the board is not covered by a scrim

### Requirement: Writing-size control look
The writing-size control SHALL look like the other segmented controls, without stray shadows.

#### Scenario: Selected size
- **WHEN** a size is selected
- **THEN** it is shown with the shared selected style
