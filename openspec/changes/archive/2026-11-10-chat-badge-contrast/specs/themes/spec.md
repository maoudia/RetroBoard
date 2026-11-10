## ADDED Requirements

### Requirement: Unread badge is readable
The count on the chat button SHALL reach WCAG AA contrast (4.5:1) against its badge colour in both variants of every theme.

#### Scenario: Dark variant
- **WHEN** a participant has unread chat messages in a dark variant of any theme
- **THEN** the count reaches 4.5:1 on its badge

#### Scenario: New theme
- **WHEN** a theme sets an ink colour that falls below 4.5:1 on its danger colour
- **THEN** the theme test fails
