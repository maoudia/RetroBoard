# Proposal

## Why

Owner report (2026-11-08, iPhone, Brave, retroboard.maoudia.com): on a phone the facilitator **History** panel is broken. Every entry shows the time, "Powy grouped "Nbbbjjj"" and a "Restore before" button, but the button's label wraps ("Restore" under its icon, "before" colliding with the next entry) and the list is cut at the bottom of the panel with no sign that it scrolls. The owner asked for the fix to be specified with a coherent UX/UI style: "Open spec this fix. Add coherent style for it with UX ui".

Root cause (found in the code): `HistoryPanel.vue` puts an icon **and a text label** in a `.mini-btn`, and `.mini-btn` (`assets/css/base.css`) is a fixed 30 x 30 px icon-only button, so the text wraps inside a 30 px box and overflows onto the next row. The same panel, the Activity feed and the Participants menu were each styled on their own (different widths, paddings, row anatomy and scroll rules), so the fix is a shared panel style, not a patch.

## What Changes

- **History entry layout** that cannot collide: time, author and what changed on one block, the restore action as a single-line icon + short label button (fr "Restaurer", en "Restore"; the full "Restore before: <action>" stays the accessible name), never wrapping, with a 40 px touch target.
- **A panel that fits the screen**: the popover height is derived from the visual viewport minus the space the app reserves (presenter bar, voting bar, safe areas), with one scroll container (no nested `max-height: 50vh`), a visible scroll affordance, and no auto-close when the mobile browser bar collapses and fires `resize`.
- **One coherent style for History, Activity and Participants**: shared tokens for width, padding, row gap and row anatomy (leading meta, body, trailing action), one empty state, one heading rule, one clock formatter, consistent ARIA.
- **Guards**: e2e at 360 and 390 px with a 40-entry fixture (no overlap, no horizontal overflow, panel inside the viewport, axe clean) and a design-token test that fails when a labelled button uses the icon-only `.mini-btn`.

Out of scope: what the history records (`board-undo-rewind`), the rewind algorithm, the Share, Export and Options dialogs (they are dialogs, not popover lists), a bottom-sheet redesign of every popover.

Bounded contexts: UI only (app layer). No protocol, domain or relay change, no traffic change (free-plan budget untouched).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-history`: the history panel layout and fit on small screens.
- `ui-coherence`: one style for the list panels of the toolbar.

## Impact

- Web: `Dropdown.vue` (viewport-fit, reserved insets, resize handling), `HistoryPanel.vue`, `ActivityFeed.vue`, `ParticipantsMenu.vue`, a small shared `PanelRow` style, `base.css` (panel tokens), i18n keys fr and en.
- Tests: e2e `history-panel-layout`, extension of `apps/web/test/design-tokens.test.ts`.
