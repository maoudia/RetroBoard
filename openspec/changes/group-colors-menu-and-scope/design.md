# Design

## Where things live

| Piece | Layer | Notes |
|---|---|---|
| `group.recolor`, `group.rename`, `group.move`, `group.merge`, `group.dissolve` | domain | unchanged; `validColor` already accepts 0 to `NOTE_COLOR_EXTENDED - 1` |
| Open groups per column | app (Pinia `ui` store) | `openGroupIds: Record<columnId, groupId>` replaces `openGroupId`; personal, not persisted |
| List of group actions (id, icon, label key, visibility rule) | app (`composables/useGroupActions.ts`) | one source for the three-dot menu and the panel footer, same rights as today (`canSteer`, locked board, frozen group) |
| Colour picking UI | app component | `ColorPicker.vue` extracted from `NoteMenu.vue` and `PaletteDialog.vue`: a row of the 8 base swatches, a "More shades" entry opening the palette dialog for a note id or a group id |
| Group menu | app component | `GroupMenu.vue`, uses `Dropdown.vue` (`menu`) like `NoteMenu.vue` |

No port, no event, no read model changes: groups already carry their colour through their notes, and the menu only sends existing commands.

## Interpretation of the owner's words

- "Same palette with advanced shades like post-it": the picker is identical, not a lookalike. A group whose notes are in an extended shade opens the palette already showing "more shades", as a note does.
- "3 dots menu on the group post-it": the three dots appear in the same place as on a note (top right of the face; on touch always visible, on pointer devices on hover and focus). Alternative considered: a long-press menu only; rejected because it is not discoverable and not keyboard reachable.
- "Opened group per column": one open group per column, any number of columns. Alternative considered: one per column plus a board-wide limit of two; rejected as an arbitrary rule.

## Open group per column

- State: `openGroupIds[columnId] = groupId`. Opening a stack sets its own column's entry; closing removes it. `GroupPanel` is rendered by its column, so each panel is anchored to its stack and its column's width (spring open and close stay as in `cluster-reveal-motion`).
- Scrim: today the panel has a full-screen scrim. With several panels the scrim moves to the column (a light dim confined to the column) so the other columns stay readable and clickable. A click on the scrim, the close button or Escape closes that panel.
- Escape closes the panel that has focus; with none focused, the most recently opened one. Focus returns to its stack.
- Closing rules: a panel closes when its group is dissolved, merged away (the target opens instead, in the target's column), moved to another column (the moved group reopens in its new column if it was open), or deleted by a reset. The cleanup in `pages/boards.vue` becomes per column.
- Presenter mode and `useJumpToSource` (jump from an action to its source) open the group in its own column without closing the others.
- Phone (360 px): a column fills the viewport width and columns are reached by swiping; a panel opens inside its column's scroll area, the column tabs show a small dot on a column with an open group. Opening a group in another column does not close the first one, so swiping back finds it open. Only one panel is ever visible at a time on a phone, so no stacking of overlays.
- TV (2560 px and above): several panels are visible side by side, each limited to its column width, text at the presenter scale.

## Colour

- The group stack shows the colours of its first two notes (`--c`, `--c2`), unchanged. After a recolour every non-frozen note has the colour, so the stack takes it.
- Contrast: the 24 shades come from the theme palettes with their existing 3:1 tests (`postit-visual-system`); the group menu adds no new colour.
- A frozen group offers no colour entry (as today); a locked board offers none either.

## Group menu content and parity with the note menu

| Entry | Who | Note menu | Group menu |
|---|---|---|---|
| Colour swatches, More shades | not locked, not frozen | yes | yes (all notes) |
| Open | everyone | n/a | yes |
| Rename | not locked | via edit | yes (opens the panel with the title focused) |
| Create an action | when action phase allows | yes | yes |
| Pin, Freeze | facilitators | yes | yes |
| Move to column | not locked | yes | yes (submenu, as the note's) |
| Merge into | not locked | group with | yes (other groups of the column) |
| Dissolve | not locked | ungroup | yes (confirm when the group is voted) |

Keyboard: the trigger is a button in the tab order after the stack; arrows move in the menu, Escape closes it and returns focus. All entries have text, icons come before labels (design rule).

## Security and privacy

Personal view state and existing signed commands only; the relay sees nothing new (no extra messages). No third-party origin, no inline style.

## Migration

None: `openGroupId` was never persisted. Boards, snapshots and events are untouched.
