## REMOVED Requirements

### Requirement: Board expiry
**Reason**: The service no longer stores boards, so there is no server-side 24 hour timer to describe.
**Migration**: Replaced by "Board lifetime" below; board files and local replicas are how a board is kept.

## ADDED Requirements

### Requirement: Board lifetime
The system SHALL keep a board only in participants' replicas and exported board files; a board SHALL disappear from the service as soon as no participant is connected and the relay is evicted, and SHALL disappear from a device when its local retention period ends.

#### Scenario: Everyone left
- **WHEN** all participants closed the board and the relay was evicted
- **THEN** the service holds no trace of the board and only participants' replicas or board files can bring it back
