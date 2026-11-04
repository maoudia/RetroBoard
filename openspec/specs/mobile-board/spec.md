# mobile-board Specification

## Purpose
Using a board on a phone: collapsing top chrome, one column per screen with a slider, compact voting bar.

## Requirements

### Requirement: Collapsing chrome on phones
On screens under 600 px wide, the toolbar, the phase bar and the voting bar SHALL hide when the person scrolls the board content down and SHALL come back when they scroll up or tap the top bar.

#### Scenario: Room to work
- **WHEN** Alice reads the notes of a column on her phone and scrolls down
- **THEN** only a slim top bar stays and the notes use the rest of the screen

### Requirement: Compact phone toolbar
On phones the toolbar SHALL show at most five icon actions and a more menu, without text labels.

#### Scenario: Toolbar on a phone
- **WHEN** Alice opens a board on a 390 px wide phone
- **THEN** the toolbar holds one row of icons and the more menu lists the other actions

### Requirement: Floor banner never overflows
The "has the floor" banner SHALL wrap or truncate its content and SHALL NOT cause horizontal overflow at any width from 320 px.

#### Scenario: Long name on a small phone
- **WHEN** a participant with a long name has the floor on a 320 px screen
- **THEN** the banner fits the screen and the page does not scroll horizontally
