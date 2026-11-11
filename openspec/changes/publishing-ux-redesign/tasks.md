# Tasks

## 1. Behaviour

- [x] 1.1 `UndoPublish` use case (10 s window, author only) and event; verify unit tests
- [x] 1.2 Keyboard handling and leave guard; verify e2e

## 2. UI

- [ ] 2.1 Top composer per column, draft tray with ribbon style, toolbar counter (fr/en); verify e2e and visual regression (delivered with e2e in `tests/e2e/publishing-composer.spec.ts`; the visual-regression part waits for the future visual-regression change, which brings the screenshot baselines)
- [x] 2.2 Mobile bottom-sheet composer with column chips; verify e2e at 360 px
- [ ] 2.3 Usability check: 5-step publish scenario recorded with Playwright trace and reviewed by the owner; verify sign-off comment on the PR (the scenario is recorded as a Playwright trace by `tests/e2e/publish-scenario.spec.ts`; the owner's sign-off is still to come)
