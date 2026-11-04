# Design

- Size controls: one `.size-rect` glyph (outlined rectangle, filled when selected) shared by the writing size and the column width; selected state uses the accent fill, never a shadow.
- Tick: `CheckPill` component (icon + label, filled when on) used wherever a bare checkbox showed text.
- Widths: columns share the container with `minmax(0, 1fr)`; text wraps (overflow-wrap anywhere); no per-column fixed width.
- Locked write areas: the chevron toggles the shared collapsed state of all columns.
- Chat: bottom sheet at 70dvh on phones, participants strip collapsed behind a chevron, composer with a rounded field and a send button that grows with the text.
- Presentation: `settings.presentGroups` (default true) expands groups in the spotlight.
- Bulk colour: command `column.color` applies a colour to every idea of a column (facilitator only), one undo step.
- Remove idea: `note.remove` by a moderator; the author keeps `note.delete`.
- Clone: pure export `cloneBoardSpec(snapshot)` (columns, theme, agenda, no content) and `actionsOnly(snapshot)`; the new board is created through the normal setup with that spec.
