## ADDED Requirements

### Requirement: Conventional Commits
Every commit that reaches the main branch SHALL have a Conventional Commits header, and every pull request title SHALL follow the same format.

#### Scenario: Invalid message
- **WHEN** a commit message does not match `type(scope): subject` with an allowed type
- **THEN** the local hook refuses it and the check on the push or pull request fails

### Requirement: Semantic version from commits
The product version SHALL follow Semantic Versioning and SHALL be computed from the commits since the last release.

#### Scenario: Feature
- **WHEN** the commits since the last release contain a `feat` and no breaking change
- **THEN** the next version increases the minor number

#### Scenario: Fix only
- **WHEN** the commits contain only `fix` or `perf` changes
- **THEN** the next version increases the patch number

#### Scenario: Breaking change
- **WHEN** a commit has `!` after the type or a `BREAKING CHANGE` footer
- **THEN** the next version increases the major number

### Requirement: Automatic release on a green main
A release SHALL be created without a manual step once the required checks of the main commit succeeded, and SHALL NOT be created while they fail or are missing.

#### Scenario: Green main
- **WHEN** `Checks` and `Quality` succeeded on the head commit and there are releasable commits
- **THEN** the release pull request is merged, `CHANGELOG.md` is updated, the tag `vX.Y.Z` and a GitHub Release with the changelog section are created

#### Scenario: Red main
- **WHEN** one of the required runs failed or has not finished
- **THEN** no release is created

### Requirement: Container image per release
Each release SHALL publish a multi-architecture container image to GitHub Container Registry, tagged with the exact version, the minor, the major and `latest`.

#### Scenario: Pull the image
- **WHEN** release 1.3.0 is published
- **THEN** `ghcr.io/maoudia/retroboard:1.3.0` exists for linux/amd64 and linux/arm64 and serves the application on port 8787

#### Scenario: No board data
- **WHEN** the container runs
- **THEN** it keeps no board data on disk or in a database (memory only, as the hosted relay)
