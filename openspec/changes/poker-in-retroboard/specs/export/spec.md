## ADDED Requirements

### Requirement: A poker session exports through the export hub
A poker room SHALL offer the same export door as a board, with the same save path, file names, icons and messages. The session SHALL export as Markdown, CSV, JSON, a copied text card, the hub's destinations (Jira, Confluence, Google, Slack, agents) and an estimation report, with "Estimates only" in place of "actions only". The CSV SHALL be in a layout that Jira's CSV import accepts: issue key, summary and estimate field, with rounds and consensus.

#### Scenario: Markdown
- **WHEN** a moderator exports a session of three decided stories as Markdown
- **THEN** the file has the title, the date, the deck, one section per story with its estimate, the rounds it took and the verdict in words, and the total, named `<name>-<date>.md`

#### Scenario: CSV for Jira
- **WHEN** the moderator exports the CSV and the stories carry Jira keys
- **THEN** each row has the key, the summary and the estimate under the chosen field name (Story Points by default), and the file re-imports through the parsers of `jira-estimation-import` unchanged

#### Scenario: Stories without a key
- **WHEN** a story has no Jira key
- **THEN** its row is kept with an empty key and the dialog says how many rows have none

#### Scenario: Estimates only
- **WHEN** the person turns on "Estimates only"
- **THEN** every format contains only the decided stories

#### Scenario: Slack
- **WHEN** the person has set their own Slack incoming webhook and sends the session
- **THEN** a formatted message goes to that webhook and to no other origin

### Requirement: Cards by person are not exported by default
An export of a poker session SHALL NOT contain what each person played unless the person turns on "Include who voted what" for that export. The default SHALL be the room's decision: the estimate, the rounds it took and the verdict.

#### Scenario: Default export
- **WHEN** a session is exported with the default options
- **THEN** no file contains a participant's name next to a card, and the participation shown is a count

#### Scenario: Explicit
- **WHEN** the person turns on "Include who voted what" and exports
- **THEN** each round lists the cards by participant, and the switch is off again for the next export

### Requirement: An estimation report
The report dialog SHALL offer an estimation report in the shell of the retro report, as a self-contained HTML file and in its encrypted variant, with the estimates table, the rounds to consensus, the verdicts, the stories parked or to split, and the participation as a count.

#### Scenario: The report
- **WHEN** a moderator opens the report of a finished session
- **THEN** it shows the estimates table, the trend of rounds to consensus, the stories that were parked or to split, and the number of participants, and it can be saved as an encrypted file
