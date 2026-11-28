## ADDED Requirements

### Requirement: A team keeps its poker decks
A team in the local team space SHALL be able to hold up to 12 saved poker decks (a name, a look, the cards and a time) and a default deck, which is the id of a saved deck or of a preset. They SHALL be part of the team's record, SHALL stay on this device in the sealed workspace and SHALL travel only through the encrypted vault, merged with the team by its last write.

#### Scenario: Twelve decks
- **WHEN** a team already has 12 saved decks and a person saves another
- **THEN** the person is told the limit and the deck is not saved until one is deleted

#### Scenario: The default
- **WHEN** a team sets a saved deck as its default
- **THEN** that deck is chosen when a poker room is started for that team, and deleting the deck clears the default

#### Scenario: Two devices
- **WHEN** two devices edit the decks of the same team while apart and then sync
- **THEN** the team's record with the later write wins on both, and no deck is duplicated

#### Scenario: Nothing in the clear
- **WHEN** a team with a saved deck is synced to a target
- **THEN** no deck name or card appears in any object of the target
