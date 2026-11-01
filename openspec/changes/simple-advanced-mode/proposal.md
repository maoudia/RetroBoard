# Proposal

## Why

Owner feedback (2026-11-01): creating, sharing and exporting show every option at once. A first retro should take seconds with the best defaults, and people who want control should still find everything.

## What Changes

- A personal "Simple / Advanced" mode (Simple by default), switchable in the profile and from a segmented control at the top of the creation page, the share dialog and the export dialog.
- Creation: Simple shows title, format and the create button; theme, facilitation, arrival popups, voting columns, passcode, agenda and carry-over actions move under Advanced. Defaults stay: one-hour agenda, everyone facilitates, popups on, format voting defaults.
- Sharing: Simple shows the link, copy, QR and the room words; Advanced adds chat and email templates, passcode, facilitator link and the privacy notes.
- Export: Simple offers the report, a Markdown copy and download, and the actions CSV; Advanced shows every destination (Jira, Confluence, Sheets, Slack, AI), the actions-only variants and the board file.
- The mode is a local preference; it never changes what a board contains, only what is shown.

Out of scope: per-board modes, hiding features for good, role based modes.

Bounded contexts: Presentation only. No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`
- `sharing`
- `export`
- `profile`

## Impact

- Web: a `uiMode` setting, a `ModeSwitch` component, conditional sections in `/new`, `BoardSetupForm`, `ShareDialog` and `ExportDialog`; i18n fr/en.
