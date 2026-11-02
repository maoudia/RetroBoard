## ADDED Requirements

### Requirement: One lead facilitator
On a "One facilitator" board (see open-facilitation-default), the system SHALL have exactly one lead facilitator at a time: the creator first, then whoever confirms taking over with the facilitator link, or the person the lead hands over to.

#### Scenario: Takeover with the link
- **WHEN** Bob opens the facilitator link while Alice leads and confirms "Take over facilitation"
- **THEN** Bob becomes the lead facilitator, Alice becomes a co-facilitator and is told

#### Scenario: Opening the link without taking over
- **WHEN** Bob opens the facilitator link and declines to take over
- **THEN** Bob joins as a co-facilitator and Alice stays the lead

### Requirement: Visible facilitator
The system SHALL show the lead facilitator with a crown badge on their pointer, on their presence markers and in the participants list.

#### Scenario: Pointer
- **WHEN** the lead facilitator moves their pointer
- **THEN** others see their pointer with a crown above the name

### Requirement: Theme by any lead
A theme chosen by the lead facilitator SHALL apply to every participant whether or not the lead created the board.

#### Scenario: After handover
- **WHEN** Alice hands over to Carol and Carol picks another theme
- **THEN** every participant sees Carol's theme
