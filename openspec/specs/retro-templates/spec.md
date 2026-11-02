# retro-templates Specification

## Purpose
Ready-made retro formats and a wizard that suggests one from goal, mood, time and season.

## Requirements

### Requirement: Format catalogue
The system SHALL offer at least 13 retro formats, each with a name, a description and its columns.

#### Scenario: Apply a format
- **WHEN** the facilitator applies a format to a board with notes and confirms
- **THEN** the columns are replaced and the notes are cleared

### Requirement: Suggestions
The system SHALL rank formats from a goal, a team mood (1-5), an available time and the board theme, and SHALL explain each suggestion.

#### Scenario: Quick format
- **WHEN** the goal is "go fast" and the time is 15 minutes
- **THEN** the top suggestion fits in 15 minutes

### Requirement: Default votable columns
Every template SHALL mark its improvement columns as votable by default.

#### Scenario: Start Stop Continue
- **WHEN** a board is created from Start Stop Continue
- **THEN** Stop and Start are votable and Continue is not
