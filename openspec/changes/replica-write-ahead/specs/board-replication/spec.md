## ADDED Requirements

### Requirement: What the board shows is not lost when the tab goes away
The system SHALL keep a synchronous copy of every event authored in this browser before the board shows it, and SHALL commit that copy to the local replica even when the page is left before the replica's own write finishes.

#### Scenario: Tab left right after adding an action
- **WHEN** a person adds an action and the page is closed or reloaded the instant the action appears, before the replica has committed it
- **THEN** reopening the board in this browser shows the action, and a carry-over from that board reads it

#### Scenario: Browser without local storage
- **WHEN** the browser refuses the synchronous copy
- **THEN** the board still works and writes its replica as before
