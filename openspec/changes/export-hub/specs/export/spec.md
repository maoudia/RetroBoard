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

### Requirement: Documented JSON schema
The JSON export SHALL follow a versioned, published JSON Schema so agents and scripts can consume it.

#### Scenario: Schema validation
- **WHEN** CI validates an exported board against the published schema
- **THEN** validation passes
