## ADDED Requirements

### Requirement: One style for the toolbar list panels
The History, Activity and Participants panels SHALL share one width token, one inner padding, one row gap, one row anatomy (leading meta, body, trailing action), one empty-state style, one clock format and one trigger ARIA pattern.

#### Scenario: Same measures
- **WHEN** the layout test opens the three panels at 390 px
- **THEN** their widths, paddings and row gaps are equal

#### Scenario: Same clock
- **WHEN** an event at 11:22 PM appears in the History and in the Activity panel
- **THEN** both show the time with the same format and tabular digits

### Requirement: A labelled button is not an icon-only button
A button that shows a text label SHALL NOT use the fixed-size icon-only class (`.mini-btn`).

#### Scenario: Audit
- **WHEN** the design-token test scans the components
- **THEN** it fails on a `.mini-btn` that contains visible text
