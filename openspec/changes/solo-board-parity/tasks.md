# Tasks

## 1. Voting is explained (the owner's question)

- [x] 1.1 `canOverride` on `Availability` (`phase-availability.ts`) and the vote control renders the locked state with reason and the "Open voting now" action for those who can override, fr and en copy; verify unit tests of the read model for participant, facilitator and no agenda, and e2e that plays the same steps solo and shared and finds the same vote control states
- [x] 1.2 The vote bar names the override ("Open voting now") with the same wording; verify e2e and axe on the locked state

## 2. Same budgets

- [x] 2.1 `packages/protocol/src/budgets.ts` (frame size, rate window, `checkFrame`) used by `relay-room.ts` and `local-relay.ts`; verify unit tests of the module and a relay test that both reject the same frames
- [x] 2.2 The in-tab relay answers the real error codes and the board shows the real notices; verify with a unit test of the in-tab relay (the app chunks pastes below the frame limit, so no UI path produces an oversized frame)

## 3. Solo stays solo, and can become shared

- [x] 3.1 Solo registry without cap (localStorage, see design); migrate the existing `retroboard:solo` list; verify unit tests with 60 rooms and the migration
- [x] 3.2 "Make this board shareable" flow (explanation, `unmarkSolo`, reconnect with `solo: false`, then the normal invitation); verify e2e with two contexts (solo board converted, a second browser joins and sees the notes)
- [x] 3.3 The Share action of a solo board opens that flow, never a dead link; verify e2e and axe

## 4. Carry-over

- [x] 4.1 Live carry-over reads the local replica when the previous room is solo (`useLiveCarryOver.ts`); verify e2e with a solo previous board

## 5. Presence panel

- [x] 5.1 Verify D6 on a solo board (relay or direct status shown?), then show "Only you here" and no link modes in solo; verify e2e

## 6. Parity guard

- [ ] 6.1 Parity matrix in `tests/e2e/solo-parity.spec.ts`: a list of scenarios (write, publish, group, vote with a running agenda, vote limits, lock, timer, actions, report) run in both modes, and the declared differences as the only allowed delta; verify the matrix fails on a seeded drift
- [ ] 6.2 ADR-0026 gets a "Consequences" addendum linking this change; docs and guide chapter text updated (`pnpm docs:tour && pnpm docs:guide`); verify `pnpm adr:check` and `pnpm docs:check`
