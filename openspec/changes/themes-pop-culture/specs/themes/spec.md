## ADDED Requirements

### Requirement: Genre themes
The system SHALL offer themes evoking popular genres with original names, colours, fonts and effects, each readable in light and dark variants.

#### Scenario: Pirates retro
- **WHEN** a facilitator picks the Buccaneer theme
- **THEN** the board shows its palette, fonts, ambient effect, themed rings and pirate-vocabulary column titles

### Requirement: No third-party intellectual property
Themes MUST NOT include titles, character names, logos, emblems, quotes, music or recognisable designs of existing works, and their fonts MUST be under the SIL Open Font License.

#### Scenario: Review
- **WHEN** a pull request adds a theme
- **THEN** it includes the completed IP checklist and the trademark search notes
