## ADDED Requirements

### Requirement: Boards belong to a team
Every new board SHALL belong to a local team and MAY belong to one of its projects.

#### Scenario: Creation
- **WHEN** Alice creates a board in simple mode
- **THEN** the last team she used is preselected and she can switch team

### Requirement: Previous actions by team
The carry-over picker SHALL list the open actions of the previous retros of the board's team only, with their source board and date, filterable by project.

#### Scenario: Two teams
- **WHEN** Alice facilitates the Payments and the Search teams and creates a Search retro
- **THEN** the picker shows the open Search actions and none from Payments

### Requirement: Share a team without board content
A team SHALL be shareable through an encrypted link or file that carries its id, name and settings and never board content.

#### Scenario: Teammate joins the team
- **WHEN** Bob opens Alice's Search team link
- **THEN** his Search boards group under the same team on his device
