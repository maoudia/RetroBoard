# Integrations

What the export hub can send to other tools, and what it takes. Everything is computed in the browser; nothing passes through the relay (change `export-hub`).

| Destination | What the user gets | Network |
|---|---|---|
| Files (Markdown, CSV, JSON, board file) | A download, previewed first | none |
| Jira | CSV of the actions, importable with Jira's CSV importer | none |
| Confluence, Google Docs | Rich HTML on the clipboard | none |
| Google Sheets, Excel | TSV on the clipboard or as a file | none |
| Slack | mrkdwn summary on the clipboard; optional post to an incoming webhook | one `POST` to `hooks.slack.com`, on a click |
| AI assistant | Markdown bundle, JSON Lines, Markdown sections ([export-rag.md](export-rag.md)) | none |

## File preview

A file button does not download: it shows the exact file first (`apps/web/app/components/FilePreview.vue`), then "Save" writes it. Name and size come from the bytes that will be written.

| File | Shown as |
|---|---|
| Report (`.html`) and Docs HTML | frame with `sandbox=""` (no script, no same-origin access, no form, no popup) |
| Markdown | rendered by `markdownToHtml` (everything escaped first) in the same kind of frame |
| CSV, TSV | table (first 300 rows; the file keeps them all) |
| JSON, JSON Lines | folded tree |
| Board file (`.retro`) | name and size only: it is encrypted |

The frame is a `srcdoc` document, so it inherits the page's Content-Security-Policy. The report's stylesheet (`REPORT_CSS`) is the only inline style allowed there: its sha256 is added to `style-src` by `apps/web/scripts/csp-hashes.mjs`, so a report previews with its own look without `'unsafe-inline'`.

## PDF

The report file has a print stylesheet (`@page` A4, repeated table header, rows and items that do not split). "Print" in the report dialog prints the in-app report, "Download" gives the HTML file; either prints to PDF from the browser. `tests/e2e/report.spec.ts` renders the downloaded file with Playwright's `page.pdf()` and reads the text and structure of the PDF (`tests/e2e/pdf-text.ts`) to prove the actions table is in it.

## Slack

### Copy (default)

"Copy the summary" puts the mrkdwn text on the clipboard; paste it in a channel or a message.

### Incoming webhook (optional, advanced mode)

The user pastes the URL of an incoming webhook of their own workspace (`https://hooks.slack.com/services/T.../B.../...`). Rules:

- The URL is a secret of the device: it lives in the device settings (`slackWebhook`, `localStorage`), never in a board event, never sent to the relay, never written to the settings file (`apps/web/app/utils/settings-file.ts` drops it on export and on import). "Forget the URL" clears it.
- Only a `https://hooks.slack.com/services/...` URL is accepted (`isSlackWebhook`); the post is sent only when the user presses "Post to Slack".
- The body is `{"text": "<summary>"}` sent as `text/plain` with no credentials and no referrer. That makes it a CORS "simple request": no preflight, which Slack does not answer.
- The Content-Security-Policy opens `connect-src` for that single origin ([ADR-0033](adr/0033-allow-one-slack-webhook-origin-in-connect-src.md)).

Tests: `apps/web/test/slack-webhook.test.ts` (URL rules, request shape, no network for another host), `apps/web/test/settings-file.test.ts` (the URL stays out of the settings file), `tests/e2e/export.spec.ts` (post from the browser, and neither the relay requests nor the WebSocket frames carry the URL).

### Browser delivery check (task 3.2), 2026-11-11

Checked in Chromium (Playwright, against `wrangler dev` serving the generated site with its real headers), from the app origin, with the same `fetch` as the app and a made-up webhook (`/services/T00000000/B00000000/XXXX...`; no workspace was available to deliver a real message):

| Check | Result |
|---|---|
| Page CSP | `connect-src 'self' https://hooks.slack.com` |
| `POST` `text/plain` to `hooks.slack.com` | sent without preflight; Slack answered `404 no_team` with `access-control-allow-origin: *` |
| Response readable by the page | yes (`status 404`, body `no_team`), so the app can tell a refusal (`rejected`) from a network failure (`unreachable`) |
| `fetch` to another origin (`example.com`) | blocked by the CSP |
| `OPTIONS` preflight on the same URL | `access-control-allow-origin: *` but no `allow-methods` / `allow-headers`: a preflighted request (for example `application/json`) would fail, which is why the body is `text/plain` |

Conclusion: CORS and CSP do not block the browser path, so the clipboard stays the default and the webhook is an opt-in on top of it. **Not yet verified: a delivery to a real workspace** (whether Slack accepts a JSON body sent as `text/plain` for a live webhook). Task 3.2 stays open until someone posts once to a real webhook and records the result here; if Slack refuses it, the app shows "Slack refused the message" and the clipboard remains.
