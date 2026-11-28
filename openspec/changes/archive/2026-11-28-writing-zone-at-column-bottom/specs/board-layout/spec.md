## ADDED Requirements

### Requirement: The writing zone sits at the foot of its column
Change: writing-zone-at-column-bottom

In every column the writing zone SHALL be the last block of the column, below the published notes, with its design unchanged, and SHALL stay in view and in reading order after the notes. On phones the composer SHALL remain the bottom sheet and only the drafts tray sits at the foot of the column.

#### Scenario: The zone is below the notes
- **WHEN** a participant opens a board with notes in a column on a desktop, a tablet or a phone
- **THEN** the writing zone (the tray on a phone) is under the last visible note of that column and not above it

#### Scenario: A long column
- **WHEN** a column holds more notes than fit its height
- **THEN** the notes scroll inside the column and the writing zone stays visible at its foot without scrolling

#### Scenario: A new idea
- **WHEN** a participant publishes an idea and the column was scrolled away from the end
- **THEN** the column scrolls so that the new note is visible just above the writing zone

#### Scenario: Keyboard
- **WHEN** a participant tabs from the column title
- **THEN** the first stop is a "Go to the writing area" link that moves the focus to the field, then the notes follow, then the zone in reading order

#### Scenario: Folding
- **WHEN** a participant folds the writing zone and then brings it back with the handle
- **THEN** the zone slides down to a handle at the foot of the column and slides up again, and the column's width, hidden-columns and sort controls still work
