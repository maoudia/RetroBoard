# i18n Specification

## Purpose
Interface languages and how content created from templates follows the creator's language.

## Requirements

### Requirement: Languages
The system SHALL offer French and English, follow the browser language by default and let the person switch language.

#### Scenario: Switch language
- **WHEN** a person selects FR on an English page
- **THEN** the interface switches to French and the choice persists after reload

### Requirement: Creator language for content
The system SHALL create template columns in the language of the person who creates the board.

#### Scenario: English board
- **WHEN** a board is created with the English interface
- **THEN** its template columns are in English
