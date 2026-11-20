## ADDED Requirements

### Requirement: Publish announcement setting
A board SHALL carry a shared setting that turns the publish announcement on or off. It SHALL be off by default, chosen in the creation form (advanced mode) and changeable by facilitators in the board options. A personal preference SHALL let a person start their new boards with it on, and simple mode SHALL apply that preference without showing the toggle.

#### Scenario: Choose at creation
- **WHEN** a facilitator switches "Announce published ideas" on in the creation form
- **THEN** every participant of the board sees the announcement when someone publishes

#### Scenario: Personal default
- **WHEN** a person sets "Announce published ideas on my new boards" in Profile
- **THEN** the creation form starts with the toggle on, and a board created in simple mode has it on

#### Scenario: Older board
- **WHEN** a board created before this setting existed is opened
- **THEN** the setting reads as off and nothing changes for its participants

#### Scenario: Change later
- **WHEN** a facilitator turns the setting on or off in the board options
- **THEN** the change applies to every participant from the next publish
