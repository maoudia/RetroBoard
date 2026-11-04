# ui-modes Specification

## Purpose
Simple and Advanced modes: one personal preference that decides which options the creation page, dialogs and profile show.

## Requirements

### Requirement: Same modes on every set-up surface
The creation page, the board set-up page and its invite step SHALL offer the simple and advanced switch and apply the same rules.

#### Scenario: Set-up page
- **WHEN** the facilitator opens the set-up page of a new board
- **THEN** the switch is shown and advanced reveals the same options as on the creation page

### Requirement: Themes in simple mode
Theme selection SHALL be available in simple mode.

#### Scenario: Simple creation
- **WHEN** Alice creates a board in simple mode
- **THEN** she can pick the theme

### Requirement: Every voting column in advanced mode
In advanced mode the vote setting SHALL be listed for every column of the board.

#### Scenario: Five columns
- **WHEN** the facilitator opens the options of a five-column board in advanced mode
- **THEN** five vote switches are listed, one per column

### Requirement: Mode switch uses shared button style
The Simple / Advanced switch SHALL use the same button style as the rest of the application, without a dedicated outline.

#### Scenario: Visual consistency
- **WHEN** the switch is displayed next to other toolbar buttons
- **THEN** it has the same radius, border and focus ring as they do
