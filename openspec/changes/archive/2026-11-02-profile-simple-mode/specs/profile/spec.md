## ADDED Requirements

### Requirement: Profile settings follow the interface mode
The profile menu SHALL show the essential settings in simple mode and every setting in advanced mode; a hidden setting SHALL keep applying with its current value.

#### Scenario: Simple profile
- **WHEN** Alice opens her profile in simple mode
- **THEN** she sees language, theme variant and retention, and not density or motion
- **AND WHEN** she switches to advanced
- **THEN** density and motion appear
