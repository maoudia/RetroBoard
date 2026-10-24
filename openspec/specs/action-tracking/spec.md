# action-tracking Specification

## Purpose
The action plan decided during the retro: actions with an optional owner and a done state.

## Requirements

### Requirement: Action plan
The system SHALL let participants add actions with an optional owner, mark them done and delete them.

#### Scenario: Add an action
- **WHEN** a participant adds "Fix flaky test" owned by "Alice"
- **THEN** every participant sees the action with its owner
