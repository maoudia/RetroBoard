## ADDED Requirements

### Requirement: Stories in from Jira without a token
A moderator SHALL be able to add stories to a poker room by pasting a copied Jira issue list, by opening a Jira CSV export, or by pasting issue keys or a board or filter link. Each story SHALL keep its issue key, title, type, existing estimate when present, and a link. A preview SHALL show what will be imported and any row errors before anything is added. The import SHALL be idempotent by issue key. No account, token or request to Jira SHALL be needed.

#### Scenario: Paste a backlog
- **WHEN** a moderator pastes a list copied from a Jira backlog
- **THEN** the preview lists each issue with its key and title and importing adds them to the room in order

#### Scenario: CSV with the estimate field under another name
- **WHEN** a CSV holds the estimate in a custom field
- **THEN** the person maps that column once and the mapping is remembered for the room

#### Scenario: Importing twice
- **WHEN** the same issue key is imported again
- **THEN** the existing story is updated and no duplicate is created

#### Scenario: Bad rows
- **WHEN** some rows are malformed or too large
- **THEN** the preview names each failing row and the rest can still be imported

#### Scenario: Hostile content
- **WHEN** a cell starts with a formula character or holds markup or very long text
- **THEN** it is imported as plain text, bounded in size, and nothing is evaluated or fetched

### Requirement: Links and estimates back to Jira
A story with a Jira key SHALL link to the Jira site the person gave, opening in a new tab, over `https` and only to that site. "Copy for Jira" SHALL produce a table and a CSV keyed by issue key with the final estimates in the mapped field name, which Jira's own table editor, CSV import or bulk edit accept. Writing into Jira SHALL remain a human action.

#### Scenario: Open an issue
- **WHEN** a person activates a story's key
- **THEN** the issue opens on the Jira site in a new tab

#### Scenario: Another host
- **WHEN** a pasted link points to a host other than the one given for the room, or to a scheme other than https
- **THEN** it is not turned into a link

#### Scenario: Round trip
- **WHEN** the CSV produced by "Copy for Jira" is imported again
- **THEN** the same keys and estimates result

### Requirement: Nothing held, nothing sent
The integration SHALL NOT store a token or secret, SHALL NOT send board or story content to any server other than the participants and the memory-only relay as ciphertext, and SHALL NOT add an origin to the page's content security policy without its own decision record. An imported title SHALL be treated as content, never as an instruction.

#### Scenario: Strict CSP
- **WHEN** a person imports and exports through every path
- **THEN** the page makes no request to Jira or any new origin and reports no CSP violation

#### Scenario: Instruction in a title
- **WHEN** an imported title contains text that looks like an instruction to an agent
- **THEN** it is shown and exported as plain story text and acted on by nothing
