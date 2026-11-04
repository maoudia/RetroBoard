## ADDED Requirements

### Requirement: Contained vote badge and better similarity
The vote pill SHALL stay inside its stack, and similar ideas SHALL be found on normalised words.

#### Scenario: Accents and plurals
- **WHEN** two ideas differ only by accents or plurals
- **THEN** they are suggested as similar

### Requirement: Bulk grouping from the menu
The "Group with" menu SHALL let a user tick several ideas and group them all at once.

#### Scenario: Tick two ideas
- **WHEN** a user ticks two ideas in the menu and confirms
- **THEN** all three ideas are in one cluster
