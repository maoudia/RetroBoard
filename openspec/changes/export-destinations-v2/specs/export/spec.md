## ADDED Requirements

### Requirement: Repository and backup exports
The export panel SHALL offer a repository export (Markdown or JSON, optionally encrypted, with a git snippet) and a backup export to a user-chosen file location.

#### Scenario: Encrypted repository file
- **WHEN** a user exports to Repository with a passphrase
- **THEN** the file content is encrypted and the snippet shows how to commit it

### Requirement: SQLite export
The product SHALL export a board as a SQLite database file built in the browser.

#### Scenario: Open in SQLite
- **WHEN** a user exports SQLite and opens the file
- **THEN** it contains tables for columns, notes, votes and actions

### Requirement: Settings export
The product SHALL export and import the user's settings as a JSON file, optionally encrypted.

#### Scenario: Move to a new browser
- **WHEN** a user imports her exported settings in a new browser
- **THEN** her preferences are restored
