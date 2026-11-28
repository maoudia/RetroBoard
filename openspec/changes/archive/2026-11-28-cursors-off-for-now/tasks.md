# Tasks

## 1. Switch it off

- [x] 1.1 Feature flag `CURSORS_ENABLED` (build-time public config, default false, read through one helper) gating `useLiveShare.ts` (no sampling, no `sendCursor`), `CursorLayer.vue`, the incoming cursor frames in `stores/live.ts`, and the laser pointer if it uses the same frames; verify unit tests with the flag on and off and an e2e with two contexts that shows no pointer and no cursor frame on the wire with the flag off (including a profile whose stored `shareCursor` is true)
- [x] 1.2 Hide the "Share my pointer" and "Show others' pointers" settings, the cursor lines of the shortcuts help and the cursor mentions of the landing and guide while the flag is off, keeping the stored values and the synced settings keys; fr and en keys kept; verify e2e of the profile, the settings-sync test that fails on an unlisted key, and `pnpm docs:check` after `pnpm docs:tour && pnpm docs:guide`
- [x] 1.3 Keep the cursor specs alive: a dedicated e2e project or environment variable runs the existing presence and cursor specs with the flag on, and the nightly keeps running it; verify `pnpm e2e:core` stays green and the nightly job list includes the flag-on run
