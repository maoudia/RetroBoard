# Proposal

## Why

Owner note (2026-11-20): "We have a lot of export menus (consolidate)."

Data leaves RetroBoard through more doors than a person can keep in their head. Reading the web app, files or copies are produced from at least these places, each with its own wording, icons and rules:

| Where | What it produces |
|---|---|
| Toolbar "Export" opening the export hub (`ExportDialog.vue`) | Markdown, CSV, JSON, copy, destinations (Jira, Confluence, Google, Slack, agents), actions only, a board file and its restore |
| The retro report (`ReportDialog.vue`, `ReportView.vue`) | the HTML report and its encrypted variant, reached from the hub and from its own button |
| Profile | personal settings file (export and import) |
| Teams (`TeamShare.vue`) | an encrypted link or a `.retroteam` file, and opening one |
| Sync (`SyncSettings.vue`) | the recovery key as a printed page, a saved file or a copy |
| The boards library | whatever the library offers per board (to be confirmed by the inventory) |
| Open changes | `export-destinations-v2` adds repository, backup, SQLite and encrypted files; `local-data-durability` adds "Save a board file"; `sync-ux` adds the sealed vault file `.rbv` |

Each new feature has so far added its own door. Without a plan the next three changes make it six more.

## What Changes

- **Inventory first.** Task 1.1 lists every export, copy and download in the app, with its file format, icon, wording and who may use it, and records it in `docs/export-map.md` so a new feature has a place to go. The table above is the starting point, not the end.
- **Three doors, each with a clear meaning.**
  1. **Export** (toolbar, one button): everything about the board in front of you, in one dialog with the destinations of `export-hub`, the report as one of them (not a second dialog), "actions only" as a filter on every destination, and the board file.
  2. **My data** (Profile): everything that is mine and not a board: settings, teams (the `.retroteam` file and link move here), the sealed vault file and its last-backup line (`sync-ux`), the library. One page, one list, same buttons.
  3. **Share** (toolbar): people and links only (invite, join code, QR). Any file it offers today moves to one of the two doors above.
  The recovery key stays in Sync: it is a secret to keep safe, not an export, and mixing it with exports would be a security mistake.
- **One save path and one vocabulary.** One `ExportAction` component and one file-type icon set drive every button and every preview; the same file names (`<board>-<date>.<ext>`), the same encrypted-or-not choice (a passphrase option when the export-destinations-v2 encryption lands), the same success and error messages, the same keyboard path.
- **No orphan doors.** Every old entry point either moves or becomes a link to its new place for one release, then is removed. Existing links, shortcuts and e2e hooks are migrated in the same pull request.
- **The two open export changes land inside this structure.** `export-hub` finishes its remaining tasks first; `export-destinations-v2` (repository, backup, SQLite, settings, icons) and `sync-ux` group 4 (the `.rbv` writer) are implemented against the consolidated panels, and their task text is updated to say which door they use.

Out of scope: new destinations or formats (those stay in `export-destinations-v2`), changing what any export contains, the sync engine, the retro report's content, direct pushes to Jira or GitHub.

Bounded contexts: Outputs (exporters, report), Profile and Team (settings and team files). Pure functions stay in `packages/exporters`. No domain, protocol or relay change; no free-plan impact; nothing leaves the browser except files the person saves or copies, as before.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `export`: three doors, one save path, no orphan entry points.

## Impact

- Web: `ExportDialog.vue`, `ReportDialog.vue`, `ProfileDialog.vue` (a "My data" section), `TeamShare.vue`, `ShareDialog.vue`, `LibraryList.vue`, a shared `ExportAction.vue`, the file-type icon set, i18n fr and en, the guide chapters on exporting and teams (manifest and chapters regenerated), `docs/export-map.md`.
- Tests: e2e specs that click the old entry points are migrated, not deleted; a guard test that fails when a new component calls the file-save port outside the shared action.
- Related: `export-hub` (base, finish first), `export-destinations-v2` (extends), `local-data-durability` task 2.2 and `sync-ux` group 4 (the board file and the vault file).
