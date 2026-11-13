# Spec Delta

## Purpose
The Contributor License Agreement that lets MAIDAF EURL ship external contributions under the AGPL and the commercial license, and the check that proves every external pull request is covered before it merges.

## ADDED Requirements

### Requirement: Agreement text
The repository SHALL publish the agreement in `docs/CLA.md` in an individual version and an entity version, each with a version number and a date, and a published agreement MUST carry no draft notice.

#### Scenario: Contributor reads the agreement
- **WHEN** a contributor opens `docs/CLA.md` from the check's comment
- **THEN** they find the version they are asked to sign, its date and both versions of the text, without a draft notice

### Requirement: Terms of the agreement
The agreement SHALL state that the contributor keeps the copyright, grants MAIDAF EURL a perpetual, worldwide, non-exclusive, royalty-free, irrevocable license to distribute the contribution under AGPL-3.0-only and under the commercial license, that the public version stays AGPL, that the contributor has the right to contribute, and that no warranty or support is owed.

#### Scenario: Contribution shipped under the commercial license
- **WHEN** MAIDAF EURL ships a signed contribution to a commercial licensee
- **THEN** the public repository keeps the same contribution under AGPL-3.0-only and the contributor keeps the copyright

### Requirement: Agreement versioning
A change of the agreement text SHALL bump its version so that earlier signatures remain attributable to the text they signed, and a contributor who signed an earlier version SHALL be asked to sign again on their next pull request.

#### Scenario: Text revised
- **WHEN** the agreement text changes after signatures exist
- **THEN** the version is bumped, the signatures file keeps the version each person signed, and a contributor who signed an earlier version is asked again on their next pull request

### Requirement: Signature check on every pull request
Every pull request SHALL carry a `CLA` commit status: success without a comment when the pull request comes from a branch of the repository or every author is in the allowlist (members, Claude, Dependabot, release-please, GitHub apps), and otherwise success only when every commit author and the pull request author has signed the current version.

#### Scenario: First external pull request
- **WHEN** a person who has not signed opens a pull request from a fork
- **THEN** the check comments the sentence to post, links the agreement and sets the `CLA` status to failure

#### Scenario: Internal pull request
- **WHEN** a pull request comes from a branch of the repository (a member, Dependabot, release-please, Claude commits)
- **THEN** the `CLA` status is success at once and nothing is asked

### Requirement: Signing and storage
A contributor SHALL sign by posting one comment with the exact sentence; the signature (login, date, pull request, version) SHALL be recorded in `signatures/cla.json` on the `cla-signatures` branch of the repository; no third-party application, secret or external service SHALL be involved, and nothing from the fork SHALL be checked out or run.

#### Scenario: Signature
- **WHEN** that person posts the sentence as a comment
- **THEN** the signature is recorded on the `cla-signatures` branch, the status turns to success on the head commit, and their later pull requests pass without a new signature while the version is unchanged

### Requirement: Enforcement and documentation
The `CLA` status SHALL be a required status check of the `main` ruleset so that an unsigned external pull request cannot merge, the runbook SHALL list it with the other required checks, and `CONTRIBUTING.md` SHALL explain the agreement, who is exempt and how to sign, without calling it a draft.

#### Scenario: Unsigned pull request
- **WHEN** an external pull request has a failing `CLA` status
- **THEN** the ruleset blocks the merge until the signature lands
