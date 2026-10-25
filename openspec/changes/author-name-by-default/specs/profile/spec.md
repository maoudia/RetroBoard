## ADDED Requirements

### Requirement: Name shown by default
When a participant enters a display name, the system SHALL show that name on the notes they publish unless they choose to stay anonymous. A choice already saved in the profile MUST be kept.

#### Scenario: First name entered
- **WHEN** Alice enters "Alice" in the name dialog without touching the other options and publishes a note
- **THEN** every participant sees "Alice" on the note

#### Scenario: Stay anonymous
- **WHEN** Alice enters her name and unticks "Show my name on my notes"
- **THEN** her name appears in the participants list and her notes stay anonymous

#### Scenario: Saved anonymous choice
- **WHEN** a participant had saved "do not show my name" before this change
- **THEN** their notes stay anonymous until they change it
