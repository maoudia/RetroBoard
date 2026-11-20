# Proposal

## Why

Owner note (2026-11-20): "Import from a Jira board or link to it to feed Scrum Poker with Fibonacci etc; be smart about the integration."

A poker room is only as useful as the stories in it, and teams keep their stories in Jira. The smart part is doing this without breaking the product's rules: `openspec/config.yaml` says integrations run in the browser with no OAuth secrets and no tokens stored by us, the strict CSP allows no third-party origin (one exception, ADR-0033, for a Slack webhook), and nothing readable goes to a server of ours. The competitor the owner points at chose not to integrate with Jira at all and tells users to copy by hand.

The technical facts that shape the answer (community reports, to be confirmed in task 1.1, not an Atlassian statement):

- Calling the Jira Cloud REST API from a browser with an API token is generally blocked by CORS; the calls that work from a page go through the OAuth 2.0 (3LO) route and `api.atlassian.com`, which needs a registered app and, as far as is known, a client secret for the code exchange.
- A page cannot read a Jira page or list on behalf of a user either.
- Jira itself can export a board's or filter's issues as CSV, and a list view can be copied as a table to the clipboard.

So the integration is designed in tiers, and the tiers that need no secret and no origin come first and are complete products on their own.

## What Changes

1. **Bring the stories in without a token (the main path).**
   - **Paste from Jira.** The facilitator copies the issue list from a Jira board backlog, filter or list view and pastes it into the room: the pasted table (rich clipboard HTML or tab-separated text) is parsed into stories with key, title, type, existing estimate and link.
   - **Open a Jira CSV.** "Export issues > CSV (current fields)" from Jira is dropped on the room or chosen as a file; the columns key, summary, issue type, status and story points (or the team's custom estimate field, which the person maps once) become stories. A preview shows what will be imported, with row errors, before anything is added.
   - **Keys only.** A list of keys or a pasted board or filter link gives stories that show the key and a deep link; the title can be typed or filled by a later paste.
2. **Link back to Jira.** The room remembers the Jira site and board link the person gives (kept inside the encrypted room, never sent to us in the clear). Each story shows its key as a link to open in Jira, and "Copy for Jira" gives the estimates as a table keyed by issue key (rich clipboard for the Jira table editor, and CSV that Jira's CSV import and bulk edit accept). Writing the estimate into Jira stays a human action of one paste.
3. **Decks that match the Jira field.** The import reads which values the team's estimate field holds and proposes the deck (Fibonacci, modified Fibonacci, T-shirt) and a custom deck when the values do not fit a preset, as the "Fibonacci etc" of the note.
4. **Optional direct read (a spike, not a promise).** If task 1.1 finds a route that needs no secret held by us and no new origin on the page (for example the official 3LO flow through a public client if the exchange can be done without a secret, or a local companion package using the user's own token on their machine, in the spirit of `retro-mcp-and-agent-sessions`), a later group may offer "Load this board" and "Write estimates back". If not, tiers 1 and 2 are the product and the limitation is documented. Any new origin in `connect-src` follows the ADR-0033 pattern and needs its own ADR and the maintainer's explicit request.

Rules that hold in every tier: no token is stored by us or in the room; a token the person pastes, if tier 4 ever exists, lives in memory only; imported text is board-grade content (encrypted with the room, never logged, never used as an instruction); the import is idempotent (the same key twice updates, never duplicates).

Out of scope: the Jira Server and Data Center flavours beyond what CSV and paste give for free, Jira automation, creating issues, importing comments or attachments, other trackers (the importer is built so GitHub, Linear and Azure DevOps CSVs can follow), anything that needs a secret on our side.

Bounded contexts: Estimation (importer into the story list), Outputs (export for Jira). Pure parsers in `packages/exporters` (or a sibling `importers` module under the same rules). No relay change beyond the events of `scrum-poker`.

## Capabilities

### New Capabilities

- `jira-import`: paste, CSV, keys and links in; table and CSV out; the safety rules.

### Modified Capabilities

None.

## Impact

- `packages/exporters` (pure parsers and writers, snapshot-tested with real Jira exports kept as fixtures with invented content), the story list of `scrum-poker`, web import dialog and mapping step, i18n fr and en, guide chapter "Estimate your Jira stories".
- Dependencies: none expected; a CSV parser is written or an existing permissively licensed one is checked for licence and size first.
- Depends on `scrum-poker` (groups 1 to 4).
