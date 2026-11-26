# Tasks

## 1. Reproduce, fix, guard

- [x] 1.1 Reproduce the broken "Group with..." list at 360, 768 and 2560 px in a light and a dark theme (1 idea, 30 ideas, a 150-character word (a new board accepts 160), a cluster as a target) and record the cause in the pull request with screenshots; verify the screenshots show the defect before the fix
- [x] 1.2 Fix the list layout in `NoteMenu.vue` (and `base.css` only if the shared `.dd-item` wrapping rule is the cause, keeping every other menu unchanged), tokens only; verify the screenshots of 1.1 after the fix and `apps/web/test/design-tokens.test.ts`
- [x] 1.3 Geometry guard e2e: every row and the "Group N" button inside the panel box, no horizontal scroll, button reachable by Tab and not under the fade mask, in the conditions of 1.1; verify that the spec fails on the code before 1.2, then passes, and axe without violation
