## ADDED Requirements

### Requirement: One aggregated test report per main commit
The system SHALL publish, for every commit on main, one Allure report that aggregates the results of the unit tests and of every end-to-end shard, on GitHub Pages and linked from the quality index. The report MUST be published even when a test job failed.

#### Scenario: Report published
- **WHEN** the Quality workflow completes on main
- **THEN** the report is available at the `/allure/` path of the quality site with every unit and end-to-end test of the commit

#### Scenario: Failing tests stay visible
- **WHEN** a test fails in a shard
- **THEN** the report lists the failure with its trace and screenshot attachments and the workflow still publishes it

### Requirement: Run history is kept
The report SHALL keep the history of previous main runs (trends, retries, flaky detection) using a history file stored on GitHub Pages, never in server-side storage.

#### Scenario: Second run
- **WHEN** a second commit is published
- **THEN** the report shows the previous run in its history and marks tests that alternate between pass and fail as flaky

### Requirement: Reporters stay out of the product
Allure packages SHALL be development dependencies only, enabled by `ALLURE_RESULTS_DIR`, and MUST NOT change the shipped bundle, the CSP or any local test run.

#### Scenario: Local run
- **WHEN** a developer runs the tests without `ALLURE_RESULTS_DIR`
- **THEN** no Allure results are written
