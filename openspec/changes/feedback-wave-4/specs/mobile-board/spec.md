## ADDED Requirements

### Requirement: Floor banner never overflows
The "has the floor" banner SHALL wrap or truncate its content and SHALL NOT cause horizontal overflow at any width from 320 px.

#### Scenario: Long name on a small phone
- **WHEN** a participant with a long name has the floor on a 320 px screen
- **THEN** the banner fits the screen and the page does not scroll horizontally
