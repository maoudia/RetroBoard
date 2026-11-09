## ADDED Requirements

### Requirement: Pinned build inputs
Every input of the container build SHALL be pinned by content: base images by digest, runtime packages by a committed lockfile with integrity hashes, and each pin SHALL be kept current by an automated update proposal.

#### Scenario: Base image is pinned
- **WHEN** the Dockerfile is read
- **THEN** every `FROM` line names an image with a `@sha256:` digest

#### Scenario: Runtime packages come from the lockfile
- **WHEN** the runtime stage installs Wrangler
- **THEN** it uses `npm ci` on a committed lockfile, never `npm install <package>`

#### Scenario: Wrangler version agrees
- **WHEN** the version in `wrangler.version` and the one in the runtime lockfile differ
- **THEN** the unit tests fail

#### Scenario: Pins move
- **WHEN** a newer base image digest or runtime package is published
- **THEN** Dependabot opens a pull request for it

### Requirement: Independent review of every change
Every change to the default branch SHALL be approved by a reviewer other than its author, and no account, administrators included, SHALL be able to bypass that rule.

#### Scenario: Clean pull request
- **WHEN** a pull request has green spec gate, no open code-scanning alert and no scanner comment
- **THEN** the review workflow approves it and auto-merge can complete

#### Scenario: Open security finding
- **WHEN** a pull request has an open code-scanning alert or a scanner comment
- **THEN** the review workflow requests changes, lists the findings, and the pull request does not merge

#### Scenario: Author cannot approve
- **WHEN** the author's own account approves a pull request
- **THEN** the approval does not satisfy the rule

### Requirement: Public security score is tracked
The project SHALL publish its OpenSSF Scorecard result, keep the checks it can move at their best score, and document the ones it cannot.

#### Scenario: Score regression
- **WHEN** a check that scored 10 drops
- **THEN** the Scorecard workflow reports it and `docs/quality.md` names the owner of the fix

#### Scenario: Checks outside our control
- **WHEN** a reader looks at `Maintained` or `Contributors`
- **THEN** `docs/quality.md` states why they are low and what changes them

### Requirement: Best Practices badge
The project SHALL earn the OpenSSF Best Practices "passing" level and show the badge in the README.

#### Scenario: Criteria map to evidence
- **WHEN** a reviewer opens the criteria checklist
- **THEN** each criterion points to the file or workflow that satisfies it
