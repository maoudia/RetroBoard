## ADDED Requirements

### Requirement: One aggregated test report per main commit
The system SHALL publish, for every commit on main, one Allure report that aggregates the results of the unit tests and of every end-to-end shard, as the front page of the GitHub Pages site. The report MUST be published even when a test job failed.

#### Scenario: Report published
- **WHEN** the Quality workflow completes on main
- **THEN** the report is the front page of the quality site with every unit and end-to-end test of the commit, and `/allure/` leads to it

#### Scenario: Whole suite
- **WHEN** the Quality workflow completes on main
- **THEN** the report lists the core e2e specs and every other e2e spec once, the second group not gating the run

#### Scenario: Failing tests stay visible
- **WHEN** a test fails in a shard
- **THEN** the report lists the failure with its trace and screenshot attachments and the workflow still publishes it

### Requirement: Coverage and mutation reports stay reachable
The site SHALL keep the coverage report under `/coverage/` and the mutation report, with the `summary.json` the mutation ratchet reads, under `/mutation/`.

#### Scenario: Ratchet reads the previous run
- **WHEN** the mutation job compares a run with the previous one
- **THEN** it reads `/mutation/summary.json` from the published site

### Requirement: Run history is kept
The report SHALL keep the history of previous main runs (trends, retries, flaky detection) using a history file stored on GitHub Pages (at most 20 runs), never in server-side storage.

#### Scenario: Second run
- **WHEN** a second commit is published
- **THEN** the report shows the previous run in its history and marks tests that alternate between pass and fail as flaky

### Requirement: Reporters stay out of the product
Allure packages SHALL be development dependencies only, enabled by `ALLURE_RESULTS_DIR`, and MUST NOT change the shipped bundle, the CSP or any local test run.

#### Scenario: Local run
- **WHEN** a developer runs the tests without `ALLURE_RESULTS_DIR`
- **THEN** no Allure results are written
