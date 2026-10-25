## ADDED Requirements

### Requirement: CI time budget
The main-branch pipeline SHALL report the duration of each job, and a toolchain change SHALL be adopted only when it removes at least 20% of a job's time without dropping a check.

#### Scenario: Faster typecheck
- **WHEN** a pull request replaces the typecheck tool
- **THEN** it includes before and after durations and the same set of type errors is detected on a fixture
