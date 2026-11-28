## ADDED Requirements

### Requirement: One creation flow for a retro and an estimation
The creation page SHALL create both kinds of room. For an estimation it SHALL show the title, the team and project, the deck gallery in place of the format picker and the agenda editor, the theme, the passcode and, in advanced mode, "Everyone moderates" and the voter cap, and SHALL start the room with the same hand-off, passcode vault and library entry as a board. Simple mode SHALL start a room in one press with the team's last theme and a generated passcode.

#### Scenario: Simple
- **WHEN** a person opens `/new?kind=poker` in simple mode and presses "Start the estimation"
- **THEN** a room opens with the team's last theme, the Fibonacci deck and a generated passcode shown in the share dialog, and it is a library entry

#### Scenario: Advanced
- **WHEN** a person opens the same page in advanced mode
- **THEN** the theme picker, the passcode generator, the moderation switch and the voter cap are shown, and the team's project can be set

#### Scenario: The same path
- **WHEN** an estimation is created
- **THEN** its key, room id and moderator secret never leave the tab except in the link, its passcode is stored in the sealed device vault and not in clear storage, and its setup travels in the same hand-off as a board's

#### Scenario: Smart title
- **WHEN** the team's last retro was "Sprint 14"
- **THEN** the estimation's title is proposed as "Sprint 15 estimation" until the person types one

### Requirement: The quick start stays
`/poker` SHALL remain a page that starts an estimation in one press with the team's defaults, and SHALL be the public page of the feature.

#### Scenario: One press
- **WHEN** a visitor presses "Start an estimation" on `/poker`
- **THEN** a room opens with the team's defaults without showing the form, and its options can change the deck and the theme
