## ADDED Requirements

### Requirement: Draft-first composer
The composer SHALL present "Add" (to my drafts) as its primary action, placed last in reading order, and "Publish now" as a secondary action placed before it.

#### Scenario: Write several ideas
- **WHEN** a participant types an idea and clicks the primary button
- **THEN** the idea becomes a private draft, the field is cleared for the next one, and nobody else sees it

#### Scenario: Order on a phone
- **WHEN** the composer is shown at 360 px wide
- **THEN** "Publish now" comes first and "Add" last, and both stay at least 24 px high
