## ADDED Requirements

### Requirement: Persistence is visible
The system SHALL tell the person whether the browser agreed to keep local boards, and SHALL propose a board file when a board has no other holder and the browser may clear it.

#### Scenario: Browser may clear storage
- **WHEN** the browser refuses persistent storage
- **THEN** the profile says that boards on this device may be cleared by the browser and links to the board file export
