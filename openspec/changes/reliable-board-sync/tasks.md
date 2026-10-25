# Tasks

## 1. Harness and reproduction

- [x] 1.1 Sync harness in `apps/web/test/sync-harness.ts` (fake relay with eviction and drops, fake RTC with a blocked-pair matrix, memory replica, fake timers) driving real `EncryptedRelayTransport` instances; verify a smoke test where three peers converge on a full mesh
- [x] 1.2 One scenario per field failure, marked `it.fails` against the current transport: partial mesh, late relay-only joiner after eviction, command during a WebSocket blip, reload within 250 ms of publishing, facilitator link on a new device with an empty relay; verify each fails for the reason stated in the proposal (done: seven scenarios in `apps/web/test/sync-field.test.ts`, each confirmed to fail on its own assertion)
- [x] 1.3 Root-cause the owner's lost facilitator board: replay the field sequence in the harness (create, share, participants on other networks, relay eviction, reload); verify the finding is written in `design.md` with the scenario that reproduces it

## 2. Two paths and anti-entropy

- [ ] 2.1 ADR-0024 "Board events on two paths, anti-entropy on every connection", superseding ADR-0017; verify `pnpm adr:check`
- [ ] 2.2 Publish every event to the mesh and the relay; delete relay-only mode, the bridge and partial-mesh forwarding; `seederOf` in the sync package with unit tests; verify the partial mesh and no-link harness scenarios pass
- [ ] 2.3 Push what `hist` lacked on welcome (with jitter) and seeder re-push on join; verify the eviction and late-joiner scenarios pass and the fake relay counts at most one full upload per join

## 3. Local-first and ready states

- [ ] 3.1 Outbox semantics: `send()` accepted once a genesis is known, delivered on the next welcome; connection status separate from board status; verify the WebSocket blip scenario (no loss, no duplicate)
- [ ] 3.2 Replica write-through for own events, flush on close and `pagehide`, kept skipped after destroy and for "until I leave"; retry failed writes and tell the page (`onReplica('failing')`, a visible "cannot save on this device" banner, fr/en) instead of swallowing the error; verify the reload and storage-failure scenarios and the IndexedDB adapter test for ordering with `delete`
- [ ] 3.3 Single creator (`creator` dep from the setup handoff) and the `waiting` state with its screen (fr/en, drafts allowed); verify the new-device scenario and e2e for the waiting screen

- [ ] 3.4 Causal local timestamps (design D9): a new local event never sorts before an event the log already holds; verify the clock-skew scenario and a unit test of the stamp rule

## 4. Field-like end-to-end

- [ ] 4.1 Playwright: one context without WebRTC, one going offline and online with `context.setOffline`, facilitator reload right after publishing, three contexts converge; keep the no-console-error guard; verify `pnpm e2e` green
- [ ] 4.2 Docs: `docs/PLAN.md` sync section, p2p spec references, free-plan budget figures; verify `pnpm verify`
- [ ] 4.3 Owner field re-test on real devices (different networks, one phone on mobile data); verify owner sign-off comment on the epic issue
