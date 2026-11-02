## ADDED Requirements

### Requirement: A board survives a reload without IndexedDB
When the browser offers no durable local storage, the board SHALL still reopen after a reload, back or forward in the same tab, from an encrypted copy kept for that tab only.

#### Scenario: Private mode reload
- **WHEN** Alice creates a board and adds an idea in a browser without IndexedDB, then reloads the page
- **THEN** the board and the idea are shown, not the waiting screen
