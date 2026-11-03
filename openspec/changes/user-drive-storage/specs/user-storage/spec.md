# user-storage Specification

## Purpose
Opt-in, encrypted persistence of boards and settings in storage owned by the user.

## ADDED Requirements

### Requirement: Opt-in encrypted persistence
When the user enables storage and chooses a folder, the application SHALL save her boards and settings there encrypted, and SHALL NOT send them to any server.

#### Scenario: Save to a synced folder
- **WHEN** a user connects her Google Drive sync folder and edits a board
- **THEN** an encrypted file for the board appears in that folder and nothing readable is written

#### Scenario: Restore on a new browser
- **WHEN** she connects the same folder in another browser and unlocks it with her secret
- **THEN** her boards and settings are restored

### Requirement: Disconnect and forget
The user SHALL be able to disconnect the storage, which removes the stored handle and any secret from the browser.

#### Scenario: Disconnect
- **WHEN** she disconnects
- **THEN** the application stops writing and keeps no access to the folder
