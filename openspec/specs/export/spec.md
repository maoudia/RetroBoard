# export Specification

## Purpose
Taking the retro content out of the board in common formats.

## Requirements

### Requirement: File exports
The system SHALL export the board as Markdown, CSV and JSON, and SHALL copy Markdown to the clipboard.

#### Scenario: CSV formula injection
- **WHEN** a note starts with "=", "+", "-" or "@"
- **THEN** the CSV cell is neutralised so spreadsheets do not run it as a formula

### Requirement: Simple export
In simple mode the export dialog SHALL offer the report, a Markdown copy and download, and the actions CSV; the destination hub, the actions-only variants and the board file SHALL appear in advanced mode.

#### Scenario: Simple export
- **WHEN** Alice opens export in simple mode
- **THEN** she sees the report, Copy as Markdown, Download Markdown and Download actions, and an "Advanced" switch for the other destinations
