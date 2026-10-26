## Purpose

Produces an automatic report of a retro (ideas, decisions, participation and metrics) on the device, shareable as a file without any server storage.

## ADDED Requirements

### Requirement: Report content
The report SHALL include the retro title, date, team, podium, all ideas grouped by column and cluster with vote counts, actions with owners and statuses, carried-over action outcomes and the retro agenda with planned and actual phase durations.

#### Scenario: Open the report
- **WHEN** the facilitator opens the report after the retro
- **THEN** every section is present and matches the board

### Requirement: Participation metrics
The report SHALL show the number of participants, ideas and votes, ideas per participant as a distribution without names unless shown on the board, and talk time shares when talk time was used.

#### Scenario: Anonymous participants
- **WHEN** some participants were anonymous
- **THEN** the report aggregates them as "Anonymous" without other identifiers

### Requirement: Shareable file
The system SHALL export the report as a single self-contained HTML file that works offline, optionally encrypted with a passphrase, and printable to PDF.

#### Scenario: Encrypted report
- **WHEN** the facilitator exports the report with a passphrase and a colleague opens the file
- **THEN** the colleague must enter the passphrase to read it

### Requirement: ROTI
The system SHALL let every participant rate the retro from 1 to 5 (return on time invested), keep one score per participant and show only the distribution and the average in the report, never who gave which score. The score is open in the close phase.

#### Scenario: Two scores
- **WHEN** one participant rates 5 and another rates 4
- **THEN** the report shows an average of 4.5 from 2 scores and one score each for 4 and 5, without names

#### Scenario: Changing one's mind
- **WHEN** a participant rates again
- **THEN** only the last score counts
