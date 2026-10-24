# export Specification

## Purpose
Taking the retro content out of the board in common formats.

## Requirements

### Requirement: File exports
The system SHALL export the board as Markdown, CSV and JSON, and SHALL copy Markdown to the clipboard.

#### Scenario: CSV formula injection
- **WHEN** a note starts with "=", "+", "-" or "@"
- **THEN** the CSV cell is neutralised so spreadsheets do not run it as a formula
