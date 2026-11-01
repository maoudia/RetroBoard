## ADDED Requirements

### Requirement: Icon at the left of every labelled button
Every button that shows a text label SHALL show an icon at the left of that label, except numeric or status chips and toggle segments.

#### Scenario: Confirmation dialog
- **WHEN** the facilitator opens the "Empty this column" confirmation
- **THEN** the Cancel button shows an x icon and the confirm button shows an eraser icon, both at the left of their labels

#### Scenario: Guard
- **WHEN** a labelled button without an icon is added to a component
- **THEN** the design guard test fails
