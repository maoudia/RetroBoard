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

### Requirement: No truncated labels
User interface labels MUST NOT be cut or overlap in any supported language at any supported screen class; when space is short, controls SHALL fall back to icons with accessible names.

#### Scenario: Pseudo-locale check
- **WHEN** CI renders every page in the pseudo-locale at 360 px and 1440 px
- **THEN** no text element overflows its container

### Requirement: Pseudo-locale
The system SHALL provide a pseudo-locale that lengthens strings by about 40%, adds accents and wraps each string in brackets, to detect hard-coded text and overflow. It SHALL be reachable only with `?lang=pseudo` for that page load, never stored and never offered in a language picker.

#### Scenario: Hard-coded string
- **WHEN** a page shows a string that is not in the dictionaries
- **THEN** it appears without pseudo-locale markers and the CI check reports it

#### Scenario: Missing key
- **WHEN** a key is missing from the dictionaries while the pseudo-locale is on
- **THEN** the key appears as it is, without brackets, and the CI check reports it

#### Scenario: Not selectable
- **WHEN** a person opens the language menu or the settings
- **THEN** the pseudo-locale is not offered, and a page loaded without `?lang=pseudo` is never in it
