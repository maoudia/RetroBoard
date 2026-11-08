# Tasks

## 1. Colour parity

- [ ] 1.1 Extract `ColorPicker.vue` (quick row of the 8 base swatches and a "More shades" entry) and make `PaletteDialog.vue` work for a note id or a group id; the cluster panel and the stack use it; fr and en keys; verify component tests, e2e recolour of a group with a base and an extended shade, a frozen note kept, and axe on the palette
- [ ] 1.2 Contrast check of the extended shades on a group stack in the 9 themes, light and dark (reuse the contrast spec of `postit-visual-system`); verify the theme contrast suite

## 2. Group menu

- [ ] 2.1 `useGroupActions` (one list of actions with rights) and `GroupMenu.vue` on the stack with the note menu's look and keyboard behaviour, panel footer reading the same list; verify unit test of the list per role, locked board and frozen group, and e2e keyboard walk
- [ ] 2.2 Dissolve confirmation for a voted group, rename from the menu focusing the panel title; verify e2e

## 3. One open group per column

- [ ] 3.1 `ui.openGroupIds` per column replacing `openGroupId`; `GroupPanel` per column with a column-scoped scrim, Escape and focus rules, per-column cleanup (dissolve, merge, move), jump-from-action and presenter entry points; verify unit test of the store and e2e with two columns open
- [ ] 3.2 Phone and TV layouts: dot on the column tab with an open group, side-by-side panels at 2560 px; verify e2e at 360 px and 2560 px with axe

## 4. Guide and docs

- [ ] 4.1 Update the guide manifest and chapter texts (group chapter: colour, menu, one open group per column), regenerate with `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`
