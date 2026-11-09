## MODIFIED Requirements

### Requirement: Board lifetime
The system SHALL keep a board only in participants' replicas and exported board files; the relay SHALL discard its buffer as soon as no participant is connected, and a board SHALL disappear from a device when its local retention period ends.

#### Scenario: Everyone left
- **WHEN** the last participant closes the board
- **THEN** the relay holds no envelope of the room, and only participants' replicas or board files can bring it back
