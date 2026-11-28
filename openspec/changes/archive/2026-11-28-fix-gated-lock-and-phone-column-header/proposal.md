# Proposal

## Why

Fourth batch of the CSS audit (owner note 2026-11-20), on boards with 36 notes, long texts, groups, all phases, the votes and the chat, at 360, 768 and 1440 px, light and dark. Two defects: the locked vote button of a note shows its lock in the note ink (dark on every note) on the dark surface of a gated control, so the lock vanishes in dark themes; and on a phone the column title is cut to two letters ("St...") because five controls share the header.

## What Changes

- The gated vote control takes the text colour of the theme, not the note ink.
- On phones the column header uses a smaller gap and side padding.

Out of scope: behaviour, strings, the board title that yields to the toolbar by design, the floating chat dock covering the end of the agenda strip. Web only, CSS.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-coherence`: a gated control stays readable in every theme variant.

## Impact

`apps/web/app/components/VoteControl.vue`, `apps/web/app/components/BoardColumn.vue`.
