## ADDED Requirements

### Requirement: Three doors for data leaving the app
Data SHALL leave the app through three places only, each with one meaning: the Export dialog for the board in front of the person (files, copies, destinations, the report, actions only, the board file), "My data" in Profile for what belongs to the person and is not a board (settings, teams, the library, the sealed vault file), and the Share dialog for people and links only. The recovery key of the vault SHALL stay with sync and SHALL NOT appear in an export list.

#### Scenario: Exporting the board
- **WHEN** a person wants a Markdown file, the retro report or only the actions of the board
- **THEN** they find all of them in the one Export dialog, the report as one of its destinations

#### Scenario: Taking my settings and teams
- **WHEN** a person wants their settings or a team file
- **THEN** they find them in Profile under "My data", and not in the board's Export or Share dialogs

#### Scenario: Old entry point
- **WHEN** a person uses an entry point that moved
- **THEN** it leads to the new place with a short message for one release, then it is removed

### Requirement: One save path
Every file save and every copy to the clipboard SHALL go through one shared action and one icon set, so names (`<board>-<date>.<ext>`), icons, previews, encrypted or plain choice, success and error messages and keyboard behaviour are the same everywhere. A guard test SHALL fail when a component saves a file outside that action.

#### Scenario: Same file name everywhere
- **WHEN** a person exports the same board as CSV from the Export dialog on two days
- **THEN** the files are named `<board>-<date>.csv` with each day's date

#### Scenario: A new feature
- **WHEN** a developer adds a component that calls the file-save port directly
- **THEN** the guard test fails and names the shared action to use
