## ADDED Requirements

### Requirement: Team and project come first in creation
The creation page and the board set-up page SHALL show the team and project choice above the format, title and other options, in simple and in advanced mode. Choosing a team SHALL apply the team's defaults to the form below without replacing a title or a format the person has already chosen.

#### Scenario: Order of the page
- **WHEN** a person opens the creation page in either mode
- **THEN** the team and project row appears before the setup form and the agenda editor

#### Scenario: Team defaults reach an untouched form
- **WHEN** a person picks a team that has a default format and a title series before typing anything
- **THEN** the form shows that format and the next title of the series

#### Scenario: Typed choices are kept
- **WHEN** a person has typed a title and then changes the team
- **THEN** the title stays as typed

#### Scenario: Simple mode default
- **WHEN** a person in simple mode never touches the team row
- **THEN** the board belongs to the last team used, with no project, as before
