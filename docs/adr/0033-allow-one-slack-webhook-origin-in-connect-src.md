---
status: accepted
date: 2026-11-11
decision-makers: Moncef Aoudia
---

# Allow one Slack webhook origin in connect-src

## Context and Problem Statement

The Content-Security-Policy is `default-src 'none'` with `connect-src 'self'` (plus the configured relay origins): the page talks to no third party. The change `export-hub` (task 3.1) lets a facilitator post the Slack summary to an incoming webhook they own. The browser has to `fetch` `https://hooks.slack.com/services/...`, which `connect-src 'self'` blocks. Which origin may the policy open, and how do we keep the webhook URL on the device?

## Decision Drivers

* Strict CSP, no third-party origin (AGENTS.md hard rules): any exception must be the narrowest possible.
* Zero infrastructure cost and no server-side storage: no relay or proxy may see the webhook URL or the summary.
* The feature is optional; clipboard stays the default.

## Considered Options

* No webhook: copy and paste only.
* Relay the post through the Worker (a proxy endpoint).
* Open `connect-src` for the single origin `https://hooks.slack.com`, post from the browser.

## Decision Outcome

Chosen option: "Open `connect-src` for the single origin `https://hooks.slack.com`, post from the browser", because a proxy would make the relay see the webhook URL and the board summary (against the end-to-end encryption rule) and cost Worker requests, while a single named origin in `connect-src` only allows `fetch` and XHR to Slack: no script, style, frame, image or form can load from it.

The URL is validated (`https://hooks.slack.com/services/T/B/token`, nothing else), stored only in the device settings (`slackWebhook`), left out of the settings file, and the post is a `text/plain` JSON body with no credentials and no referrer, sent only when the user presses "Post to Slack".

### Consequences

* Good, because the secret and the summary never leave the browser except toward Slack, on a click.
* Good, because the exception is one origin, for `connect-src` only; `script-src`, `style-src`, `frame-src` and the rest stay closed.
* Bad, because an XSS would be able to post to `hooks.slack.com` (it still could not read anything back from an arbitrary host); the strict `script-src` is the defence.
* Bad, because a webhook that Slack revokes simply fails with a message: the clipboard remains the fallback.

## More Information

OpenSpec change `export-hub` (tasks 3.1 and 3.2), `packages/exporters`, `apps/relay/src/headers.ts`, `apps/web/app/utils/slack-webhook.ts`, `docs/integrations.md`. Revisit if Slack stops answering cross-origin simple requests.
