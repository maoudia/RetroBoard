## ADDED Requirements

### Requirement: Activity rings
The system SHALL show the retro's progress as concentric rings: an outer ring for the whole retro and inner rings for the current and next phases, and SHALL continue a ring past a full turn in the overtime colour when time runs over.

#### Scenario: Middle of the Write phase
- **WHEN** 20 of 60 planned minutes have elapsed and Write is half done
- **THEN** the outer ring is one third full and the current-phase ring is half full

#### Scenario: Overtime
- **WHEN** the current phase runs 2 minutes over its 5
- **THEN** its ring completes a full turn and continues in the overtime colour
