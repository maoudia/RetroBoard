# Design

## Decisions

- Exporters are pure functions `(ReportReadModel, options) => { mime, filename, content }` in `packages/exporters`; the web app only renders the panel and calls ports.
- Rich clipboard via `ClipboardItem` with `text/html` and `text/plain`; fallback to plain text when unsupported.
- Jira CSV column names chosen for the Jira CSV importer's field mapping step (mapping remains a user step in Jira).
- Slack webhook: POST with `Content-Type: text/plain` JSON body to avoid a CORS preflight; whether Slack accepts it from browsers must be verified in task 3.2; fallback is the clipboard.
- PDF: dedicated print stylesheet of the HTML report; no PDF library.
- JSON Schema published under `/schema/board-export-v1.json` and in the repo.

Security and privacy note: exports happen on the device; nothing passes through the relay.
