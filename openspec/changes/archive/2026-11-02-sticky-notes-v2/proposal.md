# Proposal

## Why

Owner feedback (2026-10-25): notes are hard to read in some themes, colours cannot be changed comfortably during the retro, the composer forces "Enter then Publish" which fails on phones, there is no length limit the facilitator controls, and acting on a note needs a menu. Teams expect the sticky-note feel they know from physical boards.

## What Changes

- A sticky-note palette with the colours people know from paper notes (canary yellow, pink, blue, green, orange, lilac, mint, white), readable in light and dark variants; each column has a default colour used by new notes.
- Change a note's colour at any time: a quick row of swatches on the note, then a full palette sheet with large round swatches (pencil-case style, rounded, springy selection).
- Composer without the forced Enter step: "Add" and "Publish now" buttons next to the field; Enter keeps working on keyboards; on phones the keyboard's return adds a line and the buttons act.
- Facilitator sets the maximum length of a note (40 to 500 characters, default 280); every editor shows a live counter (SMS style: "143 / 280"), turning orange near the limit and red at it.
- Hover actions on a note or a draft (pointer devices): validate (publish a draft, confirm an edit) and dismiss (delete a draft, cancel an edit) icons; on touch devices the same actions sit in a long-press or tap menu.

Out of scope: per-theme artistic palettes (themes change), masonry layout (postit-visual-system).

Bounded contexts: Ideation (note colour, length limit setting), Facilitation (setting). No new relay traffic beyond the existing note events.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`: palette, default column colour, recolour UI, composer actions, length limit and counter, hover actions.

## Impact

- Domain: `settings.noteMaxLength` (bounded by `LIMITS.noteText` raised to 500), validation of note text length against the board setting; column `color`.
- Protocol: `settings.update.noteMaxLength`, `column.update.color`.
- Web: NoteCard, PrivateSection, palette sheet component, theme tokens for the sticky palette.
