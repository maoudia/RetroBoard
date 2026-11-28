# team-space Specification

## Purpose
Local team workspaces without server storage: boards belong to a team and optionally a project, carry-over of open actions stays within a team, and a team travels by encrypted link or `.retroteam` file without any board content.

## Requirements

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

### Requirement: Team and project in simple mode
Simple mode SHALL let a person choose a team (or create one) and give an optional project at creation, in one compact row; advanced mode SHALL show the same row with its longer explanation.

#### Scenario: Choose a project in simple mode
- **WHEN** a person in simple mode picks a team and types a project
- **THEN** the board is assigned to that team and project and the carry-over of the next retro can be filtered by it

#### Scenario: New team in simple mode
- **WHEN** a person in simple mode chooses "New team" and names it
- **THEN** the team is created locally and the board is assigned to it
