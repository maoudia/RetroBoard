## ADDED Requirements

### Requirement: Estimates in the board's export and report
The export dialog SHALL include the estimates of a board that has an estimation in Markdown, JSON, CSV and the report, SHALL offer an "Estimates only" filter on every destination, and SHALL NOT export what each person played unless the person turns on "Include who voted what" for that export.

#### Scenario: Markdown
- **WHEN** a facilitator exports a board with three decided tickets as Markdown
- **THEN** the file has a table with one row per ticket with its key, title, estimate, rounds and verdict, and lists the parked and split tickets

#### Scenario: Estimates only
- **WHEN** the person turns on "Estimates only"
- **THEN** every format contains only the decided tickets

#### Scenario: No cards by person
- **WHEN** a board is exported with the default options
- **THEN** no file contains a participant's name next to a card

#### Scenario: The report
- **WHEN** the report of a board with an estimation is opened
- **THEN** it has an Estimation section and can be saved as an encrypted file

#### Scenario: JSON
- **WHEN** a board with an estimation is exported as JSON
- **THEN** the file has an `estimation` section with the queue, the estimates, the flags and the rounds with their verdicts, and no card by person

#### Scenario: CSV
- **WHEN** the board is exported as CSV
- **THEN** each ticket row has an estimate column

### Requirement: A CSV that goes back into Jira's import
The export dialog SHALL offer "Estimates for Jira": a CSV with the columns Issue key, Summary and the estimate field (Story Points by default, the name asked once), one row per decided ticket with the key read from the start of the note, notes without a key left out with a count. The file SHALL re-import through the parsers of `jira-estimation-import` unchanged and no network call SHALL be made to Jira.

#### Scenario: A round trip
- **WHEN** a board of five imported tickets with decided estimates is exported for Jira and the file is read by the importer's parsers
- **THEN** it yields the same five keys and estimates

#### Scenario: No key
- **WHEN** two decided tickets have no Jira key
- **THEN** the file leaves them out and the dialog says "2 tickets have no Jira key"

#### Scenario: A T-shirt deck
- **WHEN** the deck is T-shirt sizes
- **THEN** the file writes the labels and the dialog says that Jira's Story Points expects numbers

#### Scenario: A formula
- **WHEN** a ticket's text starts with "="
- **THEN** its summary cell is neutralised so a spreadsheet does not run it
