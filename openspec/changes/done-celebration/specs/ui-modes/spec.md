## ADDED Requirements

### Requirement: Celebrations switch in advanced mode
Advanced mode SHALL offer a personal setting to turn the done celebration off, on by default and synced with the other preferences. Simple mode SHALL keep the celebration on and SHALL NOT show the setting.

#### Scenario: Turn it off
- **WHEN** a participant in advanced mode switches celebrations off
- **THEN** no celebration plays for them on any board, and other participants are not affected

#### Scenario: Simple mode
- **WHEN** a participant uses simple mode
- **THEN** the setting is not shown and the celebration plays as usual
