# Proposal

## Why

Exports today are developer-oriented (Markdown/CSV/JSON in a dropdown). Teams want to send results where they work (Jira, Confluence, Google, Slack, agents), with friendly file icons, and to export only the actions.

## What Changes

- Export panel grouped by destination with file-type icons and previews: Files, Jira, Confluence, Google, Slack, Agents.
- Structured file exports: Markdown, self-contained HTML report, PDF via print stylesheet, CSV, JSON (documented schema), encrypted board file.
- Jira: CSV in an import-friendly layout for actions; Confluence and Google Docs: rich HTML on the clipboard; Google Sheets: TSV; Slack: formatted message and optional user-provided incoming webhook.
- "Actions only" filter for every destination.
- Agents: JSON + Markdown bundle with a prompt header.

Out of scope: OAuth integrations, server-side calls.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `export`: destinations, actions-only, rich clipboard, webhook, schema.

## Impact

- `packages/exporters` (pure), web export panel, `ClipboardPort` with rich HTML.
