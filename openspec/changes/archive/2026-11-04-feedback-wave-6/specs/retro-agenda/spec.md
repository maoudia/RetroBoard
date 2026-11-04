## ADDED Requirements

### Requirement: Automatic chained agenda
New boards SHALL start with an automatic agenda: it starts at creation and each phase hands over to the next when its planned time elapses, announcing the change, unless a facilitator extends the phase.

#### Scenario: Phase time elapses
- **WHEN** the planned time of the running phase is over and it was not extended
- **THEN** the agenda moves to the next phase and announces it
