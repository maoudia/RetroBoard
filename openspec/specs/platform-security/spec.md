# platform-security Specification

## Purpose
Baseline protections of the static site and of the WebSocket relay: CSP, admission checks, limits and content-free logs.

## Requirements

### Requirement: Strict content security policy
The system MUST serve pages with a CSP that forbids inline scripts and styles without hashes, eval, framing and third-party origins.

#### Scenario: No CSP violation
- **WHEN** the landing, setup and board pages are used
- **THEN** the browser reports no CSP violation

### Requirement: Relay admission
The relay MUST reject WebSocket upgrades from foreign origins and malformed room ids, and MUST enforce message size, message rate and connection caps.

#### Scenario: Foreign origin
- **WHEN** a WebSocket upgrade comes from another site's origin
- **THEN** the relay answers 403

### Requirement: Content-free logs
The system MUST NOT log note text, names, client ids or raw room ids.

#### Scenario: Log review
- **WHEN** a board is used end to end
- **THEN** logs only contain event names and short room hashes

### Requirement: Local quality gate
A single local command SHALL run every check that blocks the main branch except the cross-browser nightly.

#### Scenario: Over budget
- **WHEN** a change makes the eager JavaScript exceed its budget
- **THEN** the local gate fails before the push

### Requirement: Lighthouse budgets
The pipeline SHALL run Lighthouse on the main pages in light and dark and fail when a budget is exceeded.

#### Scenario: Accessibility drop
- **WHEN** a change lowers the accessibility score of the board page under its budget
- **THEN** the job fails with the report attached
