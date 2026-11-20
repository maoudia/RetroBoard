## ADDED Requirements

### Requirement: Touch targets are 44 px
On a touch screen (coarse pointer) every button-like control SHALL answer to taps over an area of at least 44 by 44 CSS px, without its visible size or the layout changing.

#### Scenario: A small column button on a phone
- **WHEN** a participant taps 6 px outside the visible edge of a 30 px column button on a touch screen
- **THEN** the button receives the tap
