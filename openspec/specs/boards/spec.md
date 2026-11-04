# boards Specification

## Purpose
Creating boards and reusing them: a board can be cloned (columns, theme and agenda, never any content) and its open actions can be copied into a new empty board.

## Requirements

### Requirement: Clone a board
A board SHALL be clonable (columns, theme, agenda) and its actions SHALL be copyable into a new empty board.

#### Scenario: Clone actions only
- **WHEN** the user clones only the actions
- **THEN** a new empty board holds those actions
