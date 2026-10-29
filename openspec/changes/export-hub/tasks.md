# Tasks

## 1. Exporters

- [ ] 1.1 Report read model and pure exporters (Markdown, HTML, CSV, JSON with schema, Jira CSV, Confluence/Docs HTML, Sheets TSV, Slack mrkdwn) with actions-only options; verify unit snapshot tests per format and schema validation (done: all formats with unit tests; pending: published JSON Schema and its validation)
- [ ] 1.2 Print stylesheet for PDF; verify a Playwright PDF render contains the actions table

## 2. Panel

- [ ] 2.1 Export panel grouped by destination with icons, descriptions and previews (fr/en, phone to TV); verify e2e and visual regression (done: panel, previews, e2e; pending: visual regression)
- [x] 2.2 Rich clipboard adapter with fallback; verify e2e reading `text/html` from the clipboard in Chromium
- [ ] 2.3 File preview before saving (owner feedback 2026-10-25): the exact file rendered as the user will see it (report and Docs HTML in a sandboxed frame, CSV and TSV as a table, Markdown rendered, JSON folded) with file name and size, then "Save"; verify e2e for each format and a CSP check of the preview frame

## 3. Slack and agents

- [ ] 3.1 Slack copy and optional webhook (device-local URL); verify unit test and that the relay never receives it (done: Slack copy; pending: webhook)
- [ ] 3.2 Verify Slack webhook browser delivery manually and document the result in docs/integrations.md; keep the clipboard path as default if blocked
- [x] 3.3 Agents bundle (JSON + Markdown with prompt header); verify unit test
- [ ] 3.4 RAG-friendly export (owner feedback 2026-10-29): JSON Lines with one chunk per idea, cluster and action (id, column, cluster, votes, author kind, phase, text, links between chunks) plus a Markdown file with front matter per section, both documented with their schema; verify unit snapshot tests and schema validation
