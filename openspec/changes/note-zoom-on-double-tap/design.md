# Design

## Decisions

- **Reuse the spotlight card.** `PresenterSpotlight.vue` already has what the owner points at: the enlarged text sized by length, previous/next in the column, position, close, Escape and arrow keys, the dimmed scrim. It is extracted as `NoteZoom` with a `mode` of `presenter` (today's behaviour: non-modal dialog, state `ui.spotlightNoteId`, driven from the presenter tab) or `zoom` (modal dialog, state `ui.zoomNoteId`). One look, one set of tests, no drift between the two. The most-voted walk-through (`PresenterWalk`) keeps marking the idea on the board and is unchanged.
- **Local state only.** `ui.zoomNoteId` lives in the UI store, is never persisted, never sent, and closes on route change, when the note disappears (deleted or unpublished by someone: the zoom moves to the neighbour or closes with a notice) and when a dialog opens.
- **Gesture without delay.** A single tap on a note body has no action, so there is nothing to wait for: pointer events record the time and place of each tap, and the second tap within 300 ms and 10 px of the first opens the zoom. No `dblclick` dependency (touch browsers differ, double-tap-to-zoom of the page is suppressed with `touch-action: manipulation` on notes). Mouse uses the native `dblclick`. A pointer that moves more than 10 px, or a press longer than 500 ms, is a drag or a long press and cancels the pair.
- **Excluded targets.** The vote button, the 3-dot menu, the cluster fold control, links and any note in edit mode (its text is a field and a double click selects a word there) never start a zoom.
- **Non-conflicting key.** Enter edits a focused note today and stays so. `z` opens the zoom (free in the shortcut table, mnemonic in fr and en, listed in the help overlay under "Write"), `Escape` closes, arrows and Page keys move, as in the spotlight. The 3-dot menu has "Zoom" with the shortcut hint.
- **Modal outside presentation.** Outside presenter mode the zoom is `role="dialog" aria-modal="true"` with a focus trap, the first focus on the card, and the focus returned to the note on close. In presenter mode it stays non-modal as now (the presenter keeps the board shortcuts).
- **Masked content.** A note in a column hidden by the facilitator or masked by "one column at a time" is not zoomable (the same rule as for reading it on the board); private drafts are not on the board at all.
- **Size and motion.** The text tiers (xl, l, m, s by length) and the tokens come from the spotlight; on a 360 px phone the card is full width with the controls in a bottom bar sized for touch (44 px targets); on a TV the same clamps as today. The opening is a short fade and scale, none under reduced motion.
- **Live region.** Opening announces "Idea 3 of 7, <column>"; moving announces the position.

## Where it lives

All in `apps/web`: `NoteZoom.vue` (renamed from `PresenterSpotlight.vue`; the existing `spotlight*` test ids are kept so the current e2e specs stay valid), `useNoteZoomGesture.ts` composable (pure timing and slop function exported for unit tests), `NoteCard.vue` wiring, `NoteMenu.vue` item, `useShortcuts` table in `packages/application` (`note.zoom`), `ui` store, i18n keys in `packages/i18n`.

## Security and privacy

Nothing leaves the device: no event, no request. The zoom reads the snapshot the board already shows.

## Risks

- A double tap on a phone also triggers the browser's page zoom: `touch-action: manipulation` on the notes and `user-scalable` untouched (accessibility: pinch zoom stays available).
- Drag libraries that start on pointerdown: the gesture only listens, it never prevents default on the first tap, so dragging is unaffected.
