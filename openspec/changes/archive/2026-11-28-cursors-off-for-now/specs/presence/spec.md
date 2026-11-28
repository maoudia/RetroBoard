## ADDED Requirements

### Requirement: Shared pointers are paused behind a feature flag
Shared pointers (live cursors and the settings that control them) SHALL be disabled while the feature flag is off, which is the default. With the flag off the system SHALL NOT sample, send, receive or draw a cursor, and SHALL NOT show the pointer settings or their help text. The requirements on cursors in this specification apply only while the flag is on.

#### Scenario: Flag off, stored setting on
- **WHEN** a participant whose stored setting says "Share my pointer" moves the pointer over a board and the flag is off
- **THEN** no cursor frame is sent, no other participant sees a pointer, and the setting is not shown in Profile

#### Scenario: No cost
- **WHEN** a board runs for an hour with the flag off
- **THEN** no cursor traffic is produced on any peer link or on the relay

### Requirement: Pausing pointers keeps presence and preferences
With the flag off, every other presence signal (participant list, status, typing in a column, avatar markers) SHALL keep working, and stored pointer preferences SHALL be kept unchanged so that turning the flag on restores them.

#### Scenario: Other presence stays
- **WHEN** a participant edits a note in column 2 with the flag off
- **THEN** the others still see the typing status and the avatar marker, and no pointer

#### Scenario: Flag turned on later
- **WHEN** the flag is turned on in a later release
- **THEN** each participant's earlier choice to share or show pointers applies again without any migration
