## ADDED Requirements

### Requirement: CI time budget
The main-branch pipeline SHALL report the duration of each job, and a toolchain change SHALL be adopted only when it removes at least 20% of a job's time without dropping a check.

#### Scenario: Faster typecheck
- **WHEN** a pull request replaces the typecheck tool
- **THEN** it includes before and after durations and the same set of type errors is detected on a fixture

### Requirement: Release PRs merge without a human
The release pull request SHALL reach `main` through the same required checks as any pull request, without a maintainer approving workflow runs or merging by hand, and SHALL NOT repeat the full suite on a pull request that holds only the version and the changelog.

#### Scenario: Release PR opened with the Actions token
- **WHEN** the release workflow opens the release pull request
- **THEN** it dispatches the required checks on the release branch, deletes the `pull_request` runs held for approval, and the pull request merges once those checks are green

#### Scenario: Dispatched checks counted by the pull request
- **WHEN** the dispatched runs finish and the pull request does not report a required context as a check run
- **THEN** the workflow reports the real conclusion of the dispatched check run of that name as a commit status on the head commit, reads the required contexts from the ruleset of `main`, reports success only for a successful check run, and fails by name when a required context has no dispatched check run

#### Scenario: Required check with nothing to do
- **WHEN** a required check applies only to pull requests (mutants of the changed files, spec gate, dependency review) and runs on a dispatched run
- **THEN** it reports success without doing work instead of being skipped
