## ADDED Requirements

### Requirement: Destination-oriented export panel
The system SHALL present exports grouped by destination (Files, Jira, Confluence, Google, Slack, Agents) with a file-type icon, a one-line description and a preview for each option.

#### Scenario: Non-technical user
- **WHEN** a participant opens Export
- **THEN** they see destinations with icons and can export to Confluence without knowing what Markdown is

### Requirement: Actions only
Every export destination SHALL offer an "actions only" variant containing actions with owner, status and due date.

#### Scenario: Jira CSV of actions
- **WHEN** the facilitator exports actions only for Jira
- **THEN** a CSV file is downloaded with one row per action and columns Summary, Assignee, Status, Due date, Description

### Requirement: Rich clipboard
The system SHALL copy exports for Confluence and Google Docs as rich HTML with a plain-text fallback, so pasting keeps headings, lists and tables.

#### Scenario: Paste in Google Docs
- **WHEN** a participant copies "Google Docs" and pastes in a document
- **THEN** headings, lists and the actions table keep their structure

### Requirement: Slack delivery
The system SHALL copy a Slack-formatted summary and SHALL optionally post it to an incoming webhook URL entered by the user, without storing that URL beyond the user's device.

#### Scenario: Webhook not stored
- **WHEN** a facilitator posts to a webhook
- **THEN** the URL is kept only in that device's settings and never sent to the relay

#### Scenario: Only a Slack webhook, only on a click
- **WHEN** the entered URL is not an `https://hooks.slack.com/services/...` URL
- **THEN** it is refused and nothing is posted; a valid URL is posted to only when the participant presses "Post to Slack", as a `text/plain` request so that no CORS preflight is needed

#### Scenario: Not in a settings file
- **WHEN** the personal settings are exported to a file or imported from one
- **THEN** the webhook URL is neither written nor read

### Requirement: Printable report
The HTML report SHALL carry a print stylesheet so that printing it to PDF produces A4 pages that contain the actions table.

#### Scenario: PDF of the report
- **WHEN** the downloaded report is printed to PDF
- **THEN** the PDF pages are A4 and contain the report text and the actions table

### Requirement: Documented JSON schema
The JSON export SHALL follow a versioned, published JSON Schema so agents and scripts can consume it.

#### Scenario: Schema validation
- **WHEN** CI validates an exported board against the published schema
- **THEN** validation passes

### Requirement: File preview before saving
The system SHALL show the exact file about to be saved, rendered for its format, with its name and size, before the participant saves it.

#### Scenario: CSV for Jira
- **WHEN** a participant chooses the Jira CSV of actions
- **THEN** a table shows the rows and columns of the file with its name and size, and "Save" downloads that same file

#### Scenario: Sandboxed preview
- **WHEN** the file is HTML (the report) or Markdown
- **THEN** it is shown in a frame without script or same-origin access, under the same Content-Security-Policy as the page, and the report keeps its own stylesheet

### Requirement: RAG-friendly export
The system SHALL export a board as JSON Lines with one self-describing chunk per idea, cluster and action, and as Markdown with front matter per section, so a retrieval pipeline can index it without post-processing.

#### Scenario: Index a retro
- **WHEN** a facilitator exports a board in the RAG format
- **THEN** every line is a valid JSON object with an id, a type, the column, the vote count and the text, and clusters link to their ideas
