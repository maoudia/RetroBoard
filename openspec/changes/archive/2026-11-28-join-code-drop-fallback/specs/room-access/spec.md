## ADDED Requirements

### Requirement: Committed join only
Join by code SHALL accept only the committed exchange; a request that carries no commitment SHALL be refused.

#### Scenario: Plain request refused
- **WHEN** a request arrives without a commitment
- **THEN** the holder does not list it and the joiner is told to update the app
