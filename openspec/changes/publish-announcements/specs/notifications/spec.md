## ADDED Requirements

### Requirement: Publish announcement
When the board setting is on, every participant SHALL see one toast per batch of ideas published by the same person into the same column within 3 seconds, naming the author by the display rule of notes, the number of ideas and the column, and never the text of an idea. More than three publishers in that window SHALL give one summary toast. The same batch SHALL be one activity feed entry whether or not the setting is on.

#### Scenario: One person publishes four ideas
- **WHEN** Alex publishes 4 drafts into "Wish List" within 3 seconds and the setting is on
- **THEN** every device shows "Alex published 4 ideas to Wish List" once

#### Scenario: End of the writing phase
- **WHEN** the Write phase ends and 6 people's drafts are published automatically
- **THEN** one summary toast reports 6 people and the total number of ideas, not six toasts

#### Scenario: Anonymous author
- **WHEN** the author shows no name
- **THEN** the line says "Someone" and nothing identifies the author

#### Scenario: Setting off
- **WHEN** the setting is off and someone publishes
- **THEN** no toast shows and the activity feed still lists the batch

#### Scenario: Presenter mode
- **WHEN** the board is in presenter mode
- **THEN** the toast is not shown over the presentation and the feed entry is kept

#### Scenario: Accessibility and motion
- **WHEN** the toast shows
- **THEN** it follows the safe zone, time and reduced-motion rules of toasts and is announced once in the polite live region

### Requirement: Publish announcement is derived
The announcement SHALL be derived from the events each device already receives, SHALL be shown only for live events, and SHALL add no event and no relay traffic.

#### Scenario: Late joiner and replay
- **WHEN** a device joins or replays the log
- **THEN** no toast shows for past publishes

#### Scenario: No extra traffic
- **WHEN** a batch is announced
- **THEN** the relay receives no frame beyond the publish events themselves
