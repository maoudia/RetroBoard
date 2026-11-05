## ADDED Requirements

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
