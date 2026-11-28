# Design

## Decisions

- **Order of a column.** Header, published notes (the only scroller), writing zone. The `.col` is a flex column with a fixed height (the board gives it the viewport), `.notes` has `flex: 1` and scrolls, so a block placed after it is pinned to the foot of the column without `position: sticky`. Rejected: a sticky zone inside the scroller (it would overlay the last notes, need its own background and bottom padding, and fight the masonry columns), and a floating composer over the board (it would hide notes and duplicate the phone sheet).
- **Reachability on every screen.** Desktop and tablet (600 px and more): the zone is the foot of each column, visible whenever the column is. Phone (under 600 px): the field is the bottom sheet opened by the write button, unchanged; the only in-column piece is the drafts tray, now at the foot too. A phone column shows one column per screen, so the tray is where the thumb is.
- **A tall zone cannot squeeze the notes to nothing.** `.notes` keeps its `min-height: 120px`; the tray is capped (`22vh`, scrolls) and the field grows only by the user's own size choice, as before. On a very short window the column scrolls inside itself, as it did.
- **Drafts above the field.** Inside the zone: the title row (private mark, publish counter, size, fold), the drafts tray, then the field. Rejected: tray under the field (the field would rise by one draft height at every "Add", the thumb target moving while someone types several ideas in a row).
- **New idea in view.** Time order is oldest first, so a published note appears at the end of the list, above the zone. `NoteCard` scrolls my just-published note into view with `scrollIntoView({ block: 'nearest' })` before the flight starts (the flight measures the final rectangle). `nearest` does nothing when it is already visible; there is no smooth scrolling, so reduced motion needs no branch. Other people's notes never move the view.
- **Focus order and skip link.** DOM order equals visual order: title, controls, notes, zone. A long column would put the field behind dozens of tab stops, so a visually hidden link "Go to the writing area" (key `private.skip`) is the first stop after the header; it moves focus to the field, or to the handle when the zone is folded. It is hidden on phones and in presenter mode (no zone there) and shows on focus.
- **Fold.** The zone still folds with a vertical slide (grid rows 1fr to 0fr). The fold button and the handle swap their chevrons so they point at the direction of the slide (down to fold, up to unfold). The dashed separator is the top border of the zone and of the handle.
- **Per-column controls keep working.** The size toggle of the column (width) is in the header and untouched; the hidden-columns eye control (`HiddenColumns`) and the size picker of the zone are not moved. The turn state ("column turns") still greys the zone through `.priv-wrap`.
- **Themes and contrast.** No colour changes: the zone uses the same tokens (`--note-*`, `--note-ink`, `--border`) on the same surface, so the contrast tests keep their values. Only a border moves from the bottom to the top of the zone.

## Where it lives

`apps/web` only. No package change, so no domain or protocol work and no mutation target in `packages/` (mutation of changed files covers the web files the project already mutates, if any).

## Risks

- Muscle memory: people who got used to writing at the top find the field at the foot. Mitigated by the skip link, the write button on phones and the guide text.
- Short windows (a laptop with a docked chat): field plus tray can take most of the column. The notes keep 120 px and the zone can be folded, as before.
- E2E specs that read positions assume the old order: updated, not deleted.
