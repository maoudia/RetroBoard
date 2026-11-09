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

### Requirement: Transport security
The site MUST be served only over HTTPS on `retroboard.maoudia.com` with HSTS (max-age at least 15552000 seconds) and MUST redirect plain HTTP to HTTPS.

#### Scenario: Plain HTTP request
- **WHEN** a browser requests `http://retroboard.maoudia.com/`
- **THEN** it is redirected to the HTTPS URL and the response carries a Strict-Transport-Security header

### Requirement: Security contact
The site SHALL publish `/.well-known/security.txt` with a contact, an expiry date and the preferred language.

#### Scenario: Researcher looks for a contact
- **WHEN** someone requests `/.well-known/security.txt`
- **THEN** a valid security.txt document is returned with a non-expired Expires field

### Requirement: Legal and privacy pages
The site SHALL provide a legal notice, a privacy page that lists what the relay and Cloudflare can observe, and terms of use, in French and English, linked from every page footer.

#### Scenario: Privacy page content
- **WHEN** a visitor opens the privacy page
- **THEN** it lists room ids, IP addresses, connection times and message sizes as the only data visible to the service, and states that board content is end-to-end encrypted and not stored
