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
- Advanced palette (owner feedback 2026-11-01, replaces the free colour picker): no free colour. An "Advanced" mode of the palette offers curated, coherent sets built from the theme (for example tints and shades of the 8 note colours and a few harmonies per theme), each one passing the 4.5:1 contrast check with the note ink.
- Cluster colour (owner feedback 2026-11-01): the palette can recolour a whole cluster at once (every note of it), from the cluster panel.

Out of scope: dark-mode contrast bugs elsewhere (bug issue), masonry and density (postit-visual-system).

Bounded contexts: Ideation (notes), Profile (local signature preference). No relay traffic change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`

## Impact

- Web: composer, NoteCard, palette sheet; domain: default noteMaxLength for new boards; i18n fr/en.
