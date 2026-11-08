# Tasks

## 1. Catalogue and budgets

- [ ] 1.1 `settings-catalogue` (id, surface, class, group, label and hint keys, simple flag) holding the audit of `design.md` for the creation page, board options, profile and toolbar, and a unit test enforcing the simple budgets (4, 6 + 1, 7, 9) and that every catalogue label and hint key exists in fr and en; verify unit tests including a failing case that names the surface
- [ ] 1.2 Wording pass on the keys of every simple control (sentence case, hint of at most 90 characters, no jargon) with the pseudo-locale overflow check at 360 px; verify the i18n suite and a catalogue test on hint length

## 2. Creation page

- [ ] 2.1 Simple creation: title, theme, format, timed agenda switch (on by default, duration from the format) and an automatic password line with copy; ambient, solo and presenter-menu switches, team, project, facilitation and voting move to advanced; "Try solo" stays in the footer; verify e2e in both modes and the three-interaction time-to-first-board scenario
- [ ] 2.2 One-tap offer to bring the open actions of the team's previous board when one exists; verify e2e with a previous board

## 3. Board options

- [ ] 3.1 Options information architecture (Retro, Votes, Access, Look, Columns and format, Actions, Talk time, collapsed "Reset and delete") with simple and advanced membership read from the catalogue; verify e2e in both modes, axe clean, the budget test, destructive confirmations still asked
- [ ] 3.2 `SettingsSearch` in advanced mode for options and profile (folded matching, live count, empty state, Escape); verify unit tests of the matcher and e2e finding a setting by an unaccented word

## 4. Profile

- [ ] 4.1 Simple profile of seven rows and advanced groups Appearance, Notifications and Privacy; verify e2e in both modes and that moved settings keep their stored values

## 5. Escape hatch

- [ ] 5.1 `ModeEscape` ("Show all options", "Back to simple") on the creation page, options and profile: in-place switch, kept state and scroll, focus and live announcement, remembered; verify e2e with the dialog open and a reload

## 6. Toolbar

- [ ] 6.1 Usability check of the More-menu toolbar against today's with five first-time facilitators (create a board, run one vote), recorded in `design.md`; verify the recorded result and decide ship or drop
- [ ] 6.2 If shipped: the simple toolbar and its More menu (keyboard and screen-reader operable, phone to TV); verify e2e, axe and the budget test

## 7. Guide and docs

- [ ] 7.1 User guide: the creation and options steps in simple mode, a new "Simple and advanced" step, `docs/design-system.md` settings section, regenerated pictures; verify `pnpm docs:check`
