# Tasks

## 1. Engine and trigger

- [ ] 1.1 `celebration` field in `packages/themes` (id and palette keys per theme, data only, no framework import) and the effect engine in `apps/web/app/utils/fx.ts` (a registry of effects, a queue of at most 3 with a combined burst beyond, `prefersReducedMotion()` gives the static check mark, effects are class-based keyframes or a bounded canvas particle count, no inline style except constant bindings); verify unit tests of the queue, the collapse and the reduced-motion path, and that the engine imports nothing outside `apps/web`
- [ ] 1.2 `useDoneCelebration` composable: watches the board snapshot for an action whose status becomes `done` (and its source note or cluster), plays only for live transitions (never for the initial snapshot, a replay, anti-entropy, a history load or an undo), wired on `NoteCard.vue`, `GroupCard.vue` and `ActionsDrawer.vue` in place of the click-handler `celebrate()`; verify unit tests with a scripted snapshot sequence (live, replayed, joined late, done then reopened) and an e2e with two browser contexts where the second sees the celebration

## 2. One signature per theme

- [ ] 2.1 Effects for `color` (the existing confetti), `sticky`, `paper`, `corporate`, `minimal`; verify an e2e per effect that the class or canvas appears and clears, axe without violation, no CSP violation in the guard test, and screenshots at three frames reviewed in the pull request
- [ ] 2.2 Effects for `slate`, `cyber`, `halloween`, `noel`, `sakura`, `studio`; verify the same checks and the contrast of the effect against each theme in light and dark (reuse the contrast spec of `postit-visual-system`)

## 3. Switch and guide

- [ ] 3.1 Personal setting `celebrations` (default on) in `stores/settings.ts`, shown in Profile in advanced mode only, added to the synced settings list with the test that fails when a key is in neither list; the composable reads it; presenter mode plays nothing unless the animations are on; fr and en keys; verify unit tests, e2e (off means nothing plays, simple mode keeps it on) and the pseudo-locale overflow check
- [ ] 3.2 Guide step "Celebrate what is done" in the Actions chapter (fr and en), manifest updated, `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`
