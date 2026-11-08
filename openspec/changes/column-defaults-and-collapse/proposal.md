# Proposal

## Why

Owner feedback (2026-11-08), three requests about defaults and column controls:

1. "By default, the same size for every column should be enabled." Column sizes and writing-area sizes are set one column at a time; the "apply to every column" link (the columns icon in the writing-area row) exists but is off by default, so a facilitator who sizes one column gets uneven columns.
2. "In columns we need something to collapse groups or any columns options but spread it to all columns, line writing array a small button or use the same button to have the same behavior. It's very useful feature but this should be disabled by default." Each column already has an expand/collapse-all-groups button, and the writing-area row already has the all-columns link, but the group collapse and the column size cannot be spread to every column.
3. "Progress bar should be on off in board creation page. Enable by default." The creation page has no switch for the progress bar (the phase bar under the toolbar), so a free-flow retro that does not want it must hide it afterwards, board by board.

## What Changes

- **One "all columns" link, on by default.** The existing link (columns icon) becomes a personal setting that is ON by default and covers three things: the writing-area size, the column width, and the collapse of groups. Turning it off restores per-column control. Existing boards keep the sizes already chosen; the link only decides what a new choice applies to.
- **Collapse control spread to all columns.** The expand/collapse-all-groups button of a column stays; with the link on, using it applies to every column of the board (in the viewer's own view). The feature is OFF by default: until the person switches "Group collapse buttons" on in the profile (shown in both modes, in the board display section), the column header shows no collapse button. This keeps the header calm for people who never group.
- **Progress bar switch at creation.** A "Show the progress bar" switch on the creation page (simple and advanced mode), ON by default; it sets a board option that the facilitator can change later in the board options. Off hides the phase bar under the toolbar for everyone; the activity ring and the timer keep working.
- Documented interpretations with alternatives in design.md.

Out of scope: changing the column width model (`full`, free drag width); a new layout engine; hiding the agenda itself (the agenda is a separate switch at creation).

Bounded contexts: Facilitation (board option), UI state (personal settings). The board option travels in `settings.update` like the other settings; no new event type.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-layout`: the all-columns link on by default.
- `columns`: column size applies to all columns when linked.
- `grouping`: collapse button off by default, spread to all columns.
- `retro-agenda`: the progress bar can be turned off for a board.
- `ui-modes`: creation page switch.

## Impact

- Domain: `settings.progressBar` (optional boolean, absent means on) in the settings handler and snapshot; protocol schema of `settings.update`.
- Application: board commands `updateSettings` patch type.
- Web: `PrivateSection.vue`, `BoardColumn.vue`, `stores/ui.ts` and `stores/settings.ts` (new personal settings), `PhaseStepper` visibility, `BoardSetupForm.vue` / `pages/new.vue`, options dialog, profile dialog.
- Relay: no extra traffic (one existing event type, once per change).
- i18n: new keys (fr and en); guide chapters (create, write, options) updated in the same pull request.
