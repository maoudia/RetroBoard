## Purpose

Lets a facilitator keep team defaults and history on their own device, so retros are prepared in seconds without any account or server storage.

## ADDED Requirements

### Requirement: Local team profiles
The system SHALL let a person create team profiles on their device with a team name, a sprint counter, a default agenda, a default vote policy and an action history, and MUST NOT send them to the service.

#### Scenario: Create a team
- **WHEN** a facilitator creates "Team Atlas" with sprint 42
- **THEN** the next board proposes "Team Atlas - Sprint 43 - <date>"

### Requirement: Team file
The system SHALL export a team profile to an encrypted file protected by a passphrase and SHALL import it on another device.

#### Scenario: Hand over to a colleague
- **WHEN** a facilitator exports Team Atlas and a colleague imports it with the passphrase
- **THEN** the colleague's device has the same team defaults and action history
