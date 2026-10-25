# Tasks

## 1. Palette and colours

- [x] 1.1 `STICKY_COLORS` (8 colours, light and dark values) in packages/themes with contrast tests; map existing colour indexes; verify the theme suite
- [x] 1.2 `Column.color` default per column (domain, templates, `column.update.color`), drafts and notes start with it; verify unit tests and e2e
- [x] 1.3 Quick swatch row on notes and the full palette sheet (rounded large swatches, spring selection, reduced-motion fallback, fr/en, keyboard accessible); verify e2e on chromium and phone and axe

## 2. Composer and limits

- [x] 2.1 Composer with "Add" and "Publish now" buttons, text kept in the draft store while typing, mobile return key adds a line; verify e2e at 360 px without pressing Enter
- [x] 2.2 `settings.noteMaxLength` (40..500, default 280) as a privileged setting, enforced by the fold; verify unit tests including a modified client
- [x] 2.3 Live counter in the composer and the note editor (SMS style, warning near the limit) and the setting in Options (fr/en); verify e2e
- [ ] 2.4 Hover validate and dismiss actions on drafts and on notes being edited, menu fallback on touch; verify e2e (mouse and touch) and axe
