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
