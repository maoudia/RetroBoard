## ADDED Requirements

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
Static files whose name carries a content hash SHALL NOT count against the Worker request quota, and the capacity document SHALL state the number of Worker requests of a first visit.

#### Scenario: Hashed asset
- **WHEN** a browser requests a file under `/_nuxt/`
- **THEN** the file is served with HSTS and `nosniff` and the Worker is not invoked

#### Scenario: Missing chunk
- **WHEN** a browser requests a file under `/_nuxt/` that does not exist
- **THEN** the answer is 404, never the application shell
