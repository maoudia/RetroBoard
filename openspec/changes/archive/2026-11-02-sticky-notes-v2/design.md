# Design

## Decisions

- **Palette**: 8 sticky colours defined once in `packages/themes` (`STICKY_COLORS`, light and dark values), not per theme, so a note keeps its meaning across themes. Themes may tint the paper texture, never the hue. Contrast is tested (text on note >= 4.5:1) in the theme suite. No brand name is used in the UI ("sticky note", "note").
- **Default colour per column**: `Column.color` (index 0..7) in the domain; templates assign distinct defaults; drafts and published notes start with their column's colour; the author can change it.
- **Recolour**: any participant may recolour (existing rule); the quick row shows 4 swatches (column default first), "more" opens the palette sheet. Animations are under 250 ms and disabled with reduced motion.
- **Length limit**: `settings.noteMaxLength` (domain, privileged command). The fold rejects notes longer than the setting at the time of the event, so every replica agrees. Existing longer notes stay as they are.
- **Composer**: `PrivateSection` keeps the text in the draft store while typing (no lost text on blur); buttons "Add" (draft) and "Publish now"; Enter adds on keyboards, Shift+Enter is a new line; on `pointer: coarse` the return key inserts a line.
- **Hover actions**: CSS `:hover`/`:focus-within` reveal on `pointer: fine`; touch uses the existing note menu. Icons have accessible names.

Where things live: `Column.color`, `noteMaxLength` and the length check in `packages/domain`; the counter and palette in `apps/web`; colours in `packages/themes`.

Security and privacy note: nothing new is visible to the relay (colours and limits travel inside encrypted events).
