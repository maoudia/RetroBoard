# Tasks

## 1. All-columns link on by default

- [ ] 1.1 Personal setting `linkColumns` (default on, remembered), `ui.writeAll` replaced by it, the columns icon in the writing-area row and a profile switch bound to it, tooltip saying what it spreads; verify unit test of the store defaults and e2e that a size picked in one column sets all, and that turning it off keeps columns apart
- [ ] 1.2 Column width sizes spread to all columns while linked (grip drag stays per column); verify e2e with three columns and the link on and off, including a reload

## 2. Collapse spread, off by default

- [ ] 2.1 Personal setting `collapseButtons` (default off, switch in the profile board display section), `expand-<column>` rendered only when on; verify e2e that the button is absent by default and appears when switched on
- [ ] 2.2 Collapse and expand apply to every column with groups while linked; verify e2e on a board with groups in two columns, phone and desktop

## 3. Progress bar switch

- [ ] 3.1 Domain and protocol: `settings.progressBar` optional boolean (absent means on) in `settings.update`, snapshot and the `updateSettings` patch; verify unit tests in domain, protocol and application including an old event without the field
- [ ] 3.2 Creation page switch (simple and advanced, on by default), board options switch for facilitators, `PhaseStepper` hidden when off, ring and popup unaffected; verify e2e creation with the switch off and later on, axe on the creation page, phone and TV

## 4. Guide and docs

- [ ] 4.1 Update the guide manifest and chapter texts (create, write and options chapters), regenerate with `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`
