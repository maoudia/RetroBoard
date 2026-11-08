# Tasks

## 1. Read models and the setting

- [ ] 1.1 `reviewState(snapshot)` and `writingHidden(snapshot)` in `packages/application` (pure) and the optional `hideWritingOnReturn` board setting in the domain settings handler, the snapshot and the `settings.update` schema (old peers ignore it); verify unit tests for none, open and allDone, for every phase kind with and without ideas, rules off, and a settings event with and without the field
- [ ] 1.2 fr and en dictionary keys (`review.empty.*`, `review.allDone.*`, `writing.hidden.*`, `options.hideWriting*`) and pseudo-locale overflow; verify the i18n suite

## 2. Empty review guidance

- [ ] 2.1 `ReviewNudge` (card, then toast after six seconds, dismiss per phase run, steer-only button, saved-minutes line) and the all-done line in `ActionsReviewDialog`, placed so the invite panel still waits for the review (`ui.reviewDone`); verify e2e with two contexts (facilitator and participant), a board with no carried action and one with all done, axe clean, phone and TV screenshots reviewed
- [ ] 2.2 Chained and non-chained agendas: nothing advances by itself; verify an e2e that lets the phase timer end

## 3. Hidden writing areas when going back

- [ ] 3.1 Collapse the writing areas and show the banner in `PrivateSection` and the board header, local per-phase override, focus move, live announcement, reduced motion; verify e2e (Write to Previous actions, show anyway, drafts kept, first pass unchanged, later phases unchanged) and axe
- [ ] 3.2 The advanced option row in `OptionsDialog` bound to the setting; verify e2e that turning it off keeps the greyed composers and that a participant sees the facilitator's choice

## 4. Guide and docs

- [ ] 4.1 Agenda chapter of the user guide (manifest step, fr and en text, regenerated pictures) and `docs/user-guide` text for the empty phase and the option; verify `pnpm docs:check`
