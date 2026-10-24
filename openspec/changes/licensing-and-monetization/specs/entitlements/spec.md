## Purpose

Lets facilitators pay for larger retros and premium content without accounts or server-side storage, using license keys from a merchant of record and short-lived signed entitlement tokens.

## ADDED Requirements

### Requirement: Plans
The system SHALL define a free plan (all core retro features, up to 15 participants, sessions up to 2 hours) and paid plans that raise limits and unlock premium themes, formats and advanced features, and MUST NOT require payment for writing, grouping, voting, actions and file exports.

#### Scenario: Free retro
- **WHEN** a facilitator without a license runs a 12-person retro
- **THEN** every core feature works

### Requirement: License redemption without storage
The system SHALL exchange a valid license key for a signed entitlement token valid for 7 days, and MUST NOT store license keys, emails or customer data on the service.

#### Scenario: Redeem a key
- **WHEN** a facilitator enters a valid Pro license key
- **THEN** their device receives a token showing the Pro plan and its expiry, and the service keeps no record of the key

#### Scenario: Cancelled subscription
- **WHEN** the subscription behind a key has ended
- **THEN** redemption fails and the device falls back to the free plan when its token expires

### Requirement: Enforcement at the relay
The relay MUST verify the entitlement token signature presented by the facilitator when a room starts and MUST apply the plan's participant cap and session length; participants SHALL benefit from the facilitator's plan.

#### Scenario: Pro room
- **WHEN** a Pro facilitator starts a room and 30 people join
- **THEN** all 30 are admitted

#### Scenario: Forged token
- **WHEN** a client presents a token with an invalid signature
- **THEN** the room runs with free plan limits

### Requirement: Premium content delivery
Premium themes and formats SHALL be downloadable only with a valid entitlement token.

#### Scenario: Free user requests a premium pack
- **WHEN** a request for a premium pack has no valid token
- **THEN** the service answers 402 with a link to pricing
