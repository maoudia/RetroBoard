# Proposal

## Why

Owner feedback (2026-10-29): the composer is heavy and chatty. The hint "Only visible to you until you publish. Ctrl+Enter publishes right away, Shift+Enter adds a line." is long and dark, the character counter is too big and invisible in dark mode, the "Signed as ..." chip is wordy, and a note colour can only be changed after publishing. On published notes the quick palette on hover is noise, while the detailed palette lacks a free choice of colour.

## What Changes

- Colour swatches in the composer; the draft keeps its colour when published.
- Default note length 160 characters for new boards (was 280); existing boards keep their setting.
- Character counter: compact, shown from 80% of the limit, readable in light and dark, announced politely at the limit.
- Hint: one short line in the muted token; keyboard tips move to a small help popover.
- Signature: two explicit icon toggles (named, anonymous) with accessible names instead of the "Signed as ..." chip.
- No colour palette on note hover; colour stays in the note menu and the palette sheet.
- Detailed palette: a free colour picker as the last option, guarded by a contrast check against the note ink (ink switches, or the colour is refused under 4.5:1).

Out of scope: dark-mode contrast bugs elsewhere (bug issue), masonry and density (postit-visual-system).

Bounded contexts: Ideation (notes), Profile (local signature preference). No relay traffic change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`

## Impact

- Web: composer, NoteCard, palette sheet; domain: default noteMaxLength for new boards; i18n fr/en.
