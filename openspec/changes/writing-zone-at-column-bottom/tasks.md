# Tasks

## 1. Move the zone and keep it reachable

- [ ] 1.1 `BoardColumn.vue`: order header, notes, writing zone; `PrivateSection.vue`: tray above the field, separator on top, fold and handle chevrons reversed; scroll a just-published note into view in `NoteCard.vue`; verify unit tests of the design tokens and the existing component tests
- [ ] 1.2 Skip link "Go to the writing area" (`private.skip` in fr and en) as first stop after the column header, hidden on phones and in presenter mode; verify e2e keyboard path and axe

## 2. Tests

- [ ] 2.1 Update the e2e specs that assume the old order (`publishing-composer`, `publish-scenario`, any other found by running the core gate), none deleted; verify they pass
- [ ] 2.2 Geometry e2e: the zone is below the last note on desktop, tablet and phone (tray), stays in view with a long column, a new note scrolls into view, fold and unfold, size toggle and hidden-column eye still work; verify axe and both light and dark themes

## 3. Docs and guide

- [ ] 3.1 `docs/design-system.md` and the guide chapter "Write" (fr and en), manifest anchors if needed, `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`
