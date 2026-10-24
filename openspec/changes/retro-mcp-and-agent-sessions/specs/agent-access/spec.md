## Purpose

Lets AI agents take part in a retro through a local MCP server, with explicit scopes, quotas and a time box decided by the facilitator, while keeping end-to-end encryption.

## ADDED Requirements

### Requirement: Agent invitation
The facilitator SHALL be able to create an agent invitation with a name, scopes, a maximum number of ideas and an expiry, and MUST be able to revoke it at any time.

#### Scenario: Revoke
- **WHEN** the facilitator revokes an agent invitation
- **THEN** every participant ignores that agent's later events

### Requirement: Time-boxed agent sessions
Agent events MUST be ignored by every participant after the invitation expiry or once the agent's quota is used.

#### Scenario: Quota reached
- **WHEN** an agent with a quota of 5 ideas sends a sixth idea
- **THEN** the sixth idea does not appear on the board

### Requirement: Labelled agent contributions
Ideas and feedback from agents SHALL be visibly labelled as agent contributions with the agent's name, SHALL be collapsible, and SHALL NOT be votable unless the facilitator allows it.

#### Scenario: Agent feedback
- **WHEN** an agent adds feedback "3 flaky tests this sprint"
- **THEN** participants see it with a robot badge in the Agents lane

### Requirement: Local MCP server
The system SHALL provide an MCP server that runs on the user's machine, joins a board from an agent invitation link, and exposes tools to read the board, add ideas and feedback, vote when allowed, list and propose actions, and summarise.

#### Scenario: Claude Code adds feedback
- **WHEN** a developer runs the MCP server with an invitation link and asks their agent to add sprint feedback
- **THEN** the feedback appears on the board within 2 seconds, labelled with the agent name

### Requirement: Encryption preserved
The MCP server MUST encrypt and decrypt locally and MUST NOT send plaintext board content to any service other than the MCP client that launched it.

#### Scenario: Network capture
- **WHEN** the MCP server's network traffic is inspected
- **THEN** only encrypted envelopes to the relay are found
