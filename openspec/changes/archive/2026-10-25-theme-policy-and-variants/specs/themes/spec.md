## REMOVED Requirements

### Requirement: Personal theme override
**Reason**: The product owner wants the retro theme chosen by the facilitator to be respected by every participant.
**Migration**: Participants keep accessibility control through the light/dark variant switch; stored "my theme" settings are ignored and deleted on next start.

## ADDED Requirements

### Requirement: Light and dark variants
Every theme MUST provide a light and a dark variant, and each participant SHALL be able to choose light, dark or system for their own screen without changing the board theme.

#### Scenario: Dark variant on a light theme
- **WHEN** a participant selects "Dark" while the board uses Studio
- **THEN** that participant sees Studio dark and every other participant keeps their own variant choice

### Requirement: Theme set by the facilitator
The system MUST only accept board theme changes made by the facilitator or a co-facilitator.

#### Scenario: Participant tries to change the theme
- **WHEN** a participant without facilitator rights opens board options
- **THEN** the theme picker is read-only and shows who can change it

### Requirement: Product pages use the product design
The landing page, the board creation page and the profile dialog MUST use the product design system and MUST NOT use a board theme.

#### Scenario: Profile after a Halloween board
- **WHEN** a person who just left a Halloween board opens the profile from the landing page
- **THEN** the profile dialog uses the landing design, not Halloween

### Requirement: Variant contrast
Both variants of every theme MUST meet WCAG AA contrast for text, note ink and controls.

#### Scenario: Contrast suite
- **WHEN** the theme test suite runs
- **THEN** every theme variant passes the AA checks
