# companion-persona Specification

## Purpose
A playful, optional, local-only retro companion.

## ADDED Requirements

### Requirement: Opt-in playful companion
The companion SHALL be off by default, SHALL run only on a local model or fixed lines, and SHALL NOT send board content anywhere.

#### Scenario: Enabled without a model
- **WHEN** a user enables the Pirate companion with no local model
- **THEN** it shows fixed fr or en lines between phases and makes no network call

#### Scenario: Default
- **WHEN** a user joins a board
- **THEN** no companion is shown
