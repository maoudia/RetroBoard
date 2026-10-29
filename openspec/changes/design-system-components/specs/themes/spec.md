## ADDED Requirements

### Requirement: Themes are token sets
A theme SHALL only define design tokens; every component SHALL take its look from the tokens and the shared primitives.

#### Scenario: New theme
- **WHEN** a contributor adds a theme file
- **THEN** every screen follows it without component changes

### Requirement: Explicit dropdowns
Every dropdown SHALL show its current value and an open indicator, and SHALL be operable with the keyboard.

#### Scenario: Closed select
- **WHEN** a participant looks at the language select
- **THEN** they see the current language and a chevron
