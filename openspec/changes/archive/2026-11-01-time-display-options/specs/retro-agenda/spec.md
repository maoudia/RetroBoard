## ADDED Requirements

### Requirement: Elapsed or remaining time
A participant SHALL be able to choose, separately for the phase stepper and for the global ring, whether they show the elapsed or the remaining time; by default the stepper SHALL show elapsed time and the ring SHALL show remaining time.

#### Scenario: Defaults
- **WHEN** Bob opens a running retro for the first time
- **THEN** the stepper shows how long the current phase has run and the ring shows the time left for the retro

#### Scenario: Switch
- **WHEN** Bob sets the stepper to remaining time
- **THEN** the stepper shows the time left in the phase and the ring is unchanged

### Requirement: Visible overtime
A phase past its planned time SHALL show zero time left in the overtime colour, then the time over as "+m:ss".

#### Scenario: Two minutes over
- **WHEN** the Group phase is two minutes past its planned time
- **THEN** the stepper segment is in the overtime colour and reads "+2:00"
