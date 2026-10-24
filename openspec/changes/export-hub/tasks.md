# Tasks

## 1. Exporters

- [ ] 1.1 Report read model and pure exporters (Markdown, HTML, CSV, JSON with schema, Jira CSV, Confluence/Docs HTML, Sheets TSV, Slack mrkdwn) with actions-only options; verify unit snapshot tests per format and schema validation
- [ ] 1.2 Print stylesheet for PDF; verify a Playwright PDF render contains the actions table

## 2. Panel

- [ ] 2.1 Export panel grouped by destination with icons, descriptions and previews (fr/en, phone to TV); verify e2e and visual regression
- [ ] 2.2 Rich clipboard adapter with fallback; verify e2e reading `text/html` from the clipboard in Chromium

## 3. Slack and agents

- [ ] 3.1 Slack copy and optional webhook (device-local URL); verify unit test and that the relay never receives it
- [ ] 3.2 Verify Slack webhook browser delivery manually and document the result in docs/integrations.md; keep the clipboard path as default if blocked
- [ ] 3.3 Agents bundle (JSON + Markdown with prompt header); verify unit test
