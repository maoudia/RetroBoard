## ADDED Requirements

### Requirement: Phase switches in advanced mode only
Advanced mode SHALL show the per-phase capability switches in the board options and in the creation agenda editor. Simple mode SHALL show no capability switch, SHALL apply the recommended preset of every phase, and SHALL keep the single choice of phase rules on or off.

#### Scenario: Simple mode
- **WHEN** a facilitator opens the options of a board in simple mode
- **THEN** no per-phase switch is shown and every phase follows its recommended preset

#### Scenario: Advanced mode
- **WHEN** a facilitator opens the options in advanced mode
- **THEN** a "Phases" section lists every phase with its switches, a "Reset to recommended" button and a plain-language summary of the running phase

#### Scenario: Switching modes
- **WHEN** a facilitator who customised phases in advanced mode returns to simple mode
- **THEN** the custom policy stays in force and a line says that the board uses a custom plan with a link to reset it
