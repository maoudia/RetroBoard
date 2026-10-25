## ADDED Requirements

### Requirement: Peek into a cluster
The system SHALL show a cluster's notes on hover (after a short delay) on pointer devices and on tap on touch devices, without changing the board for others.

#### Scenario: Hover
- **WHEN** a participant rests the pointer on a cluster for 300 ms
- **THEN** a preview lists the cluster's notes and disappears when the pointer leaves

#### Scenario: Tap on a phone
- **WHEN** a participant taps a cluster on a phone
- **THEN** the cluster opens and a second tap or a swipe closes it

### Requirement: Cluster motion
Opening and closing a cluster SHALL animate from the stack to the notes and back in under 400 ms, and SHALL not animate when the participant prefers reduced motion.

#### Scenario: Reduced motion
- **WHEN** reduced motion is on and a participant opens a cluster
- **THEN** the notes appear without animation
