## ADDED Requirements

### Requirement: A clear choice between a retro and an estimation
The landing page SHALL offer one choice between a retro and an estimation above a single filled call to action that follows the choice, SHALL default to the retro so that the prerendered page is unchanged, and SHALL NOT carry a separate Scrum Poker button, navigation entry or menu line. "Try it solo" SHALL be offered for a retro only. The estimation SHALL carry the Beta mark until the owner promotes it.

#### Scenario: Default
- **WHEN** a visitor opens the landing page
- **THEN** the choice shows Retro selected, the call to action says "Start a retro" and goes to `/new`, and the page is the prerendered one

#### Scenario: Estimation
- **WHEN** the visitor chooses Estimation
- **THEN** the call to action says "Start an estimation" and goes to `/new?kind=poker`, "Try it solo" is not shown, and the choice is remembered on this device

#### Scenario: One front door
- **WHEN** the landing page, the boards menu and the library page are inspected
- **THEN** none of them has a separate Scrum Poker button or line
