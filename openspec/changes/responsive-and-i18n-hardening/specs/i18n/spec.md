## ADDED Requirements

### Requirement: No truncated labels
User interface labels MUST NOT be cut or overlap in any supported language at any supported screen class; when space is short, controls SHALL fall back to icons with accessible names.

#### Scenario: Pseudo-locale check
- **WHEN** CI renders every page in the pseudo-locale at 360 px and 1440 px
- **THEN** no text element overflows its container

### Requirement: Pseudo-locale
The system SHALL provide a development-only pseudo-locale that lengthens strings by about 40% and adds accents, to detect hard-coded text and overflow.

#### Scenario: Hard-coded string
- **WHEN** a page shows a string that is not in the dictionaries
- **THEN** it appears without pseudo-locale markers and the CI check reports it
