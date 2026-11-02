## ADDED Requirements

### Requirement: Next retro title suggestion
The creation form SHALL prefill the title with the previous board's title incremented by one when that title ends with a small number, and SHALL keep the dated default otherwise.

#### Scenario: Sprint increment
- **WHEN** Alice opened "Sprint 42" earlier and opens the creation page
- **THEN** the title field shows "Sprint 43"
