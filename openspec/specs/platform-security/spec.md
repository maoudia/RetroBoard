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

### Requirement: Production proof of the relay
After every production deploy and on a schedule, the system SHALL prove that the relay refuses a foreign origin and accepts a connection from its own origin, and a deploy that fails this proof SHALL be rolled back.

#### Scenario: Foreign origin in production
- **WHEN** the smoke test requests a WebSocket upgrade on `/ws2` with the origin `https://evil.example`
- **THEN** the answer is 403 and the check passes only on that status

#### Scenario: A board can connect
- **WHEN** the smoke test opens `/ws2` for a random room with the site's own origin
- **THEN** it receives a `welcome` frame and a `hist` frame marked done within 5 seconds

#### Scenario: Relay removed
- **WHEN** the relay route does not answer
- **THEN** the smoke test exits with a failure

### Requirement: Request budget
Static files whose name carries a content hash SHALL NOT count against the Worker request quota, and the capacity document SHALL state the number of Worker requests of a first visit. The asset layer SHALL answer a missing file with a 404 that no cache can keep, never with the application shell.

#### Scenario: Hashed asset
- **WHEN** a browser requests a file under `/_nuxt/` that exists
- **THEN** the file is served by the asset layer without invoking the Worker, with HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy` and `X-Robots-Tag`, and without an immutable cache header

#### Scenario: Missing chunk
- **WHEN** a browser requests a file under `/_nuxt/` that does not exist
- **THEN** the answer is 404 with a body that is not HTML, never the application shell, and no cache may keep it: no `Cache-Control` header when the asset layer answers (production), `no-store` when the Worker answers it (the self-host image, `run_worker_first: true`)

#### Scenario: Smoke test of the asset layer
- **WHEN** the smoke test runs against production or against the self-host image (`Container` workflow)
- **THEN** it fails if a missing `/_nuxt/` file answers the shell or a cacheable error, or if the entry script loses `nosniff` or HSTS

#### Scenario: Unknown path
- **WHEN** a browser navigates to a path that is neither a file nor an application route, including `/guide/` followed by an unknown name
- **THEN** the answer is 404 with the branded error page

#### Scenario: Page load cost
- **WHEN** a browser loads the landing page with an empty cache
- **THEN** one request invokes the Worker, the files under `/_nuxt/` being served by the asset layer
