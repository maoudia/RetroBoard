# Design

## Analysis: why you cannot vote in a solo board

The domain is identical for both kinds of board (`packages/domain/src/voting/handlers.ts`, `policy.ts`: no solo flag). The behaviour comes from the web layer:

1. A new board starts with the agenda running (`pages/new.vue`, `agenda-autostart` on by default). The first phases are not Vote.
2. In a solo board the only participant is the facilitator (`creator`, `pages/boards.vue:98`). `bypassesPhaseRules(ledger, key)` is true for every role but `participant` (`packages/domain/src/access/ledger.ts:113`), and the snapshot exposes it as `access.bypassesPhase` (`packages/domain/src/shared/types.ts:276`).
3. `phaseAvailability(agenda, 'vote.add', bypasses)` returns `{ allowed: true, bypassed: true, closedBy: 'write', opensAt: 'vote' }` for them (`packages/application/src/read-models/phase-availability.ts:21-28`).
4. `VoteControl.vue` has two branches: a lock for `gate.closedBy && !gate.allowed` (participants only) and the buttons for `board.allowed('vote.add') && !gate.bypassed`. A facilitator in a closed phase is in neither (comment: "A facilitator who could override the phase sees no vote buttons outside the vote phase either (#231)"): **nothing is rendered, with no reason**.
5. The way out is the "Vote open" pill of the vote bar (`agenda.voteOpen`), which does not say that it is the way to vote.

Probe (temporary Playwright spec, same steps solo and shared, 2026-11-08): with the agenda off, one vote button per note on both; with the default agenda running, **no vote button, no lock** on both, `voting-open` present on both. So solo and shared agree; the drift is between what a facilitator sees and what a participant sees, and a solo user is always the former.

## Drift table

| # | Drift | Where | Cause | Proposed fix |
|---|---|---|---|---|
| D1 | No vote button, no reason outside the Vote phase for anyone who can override the phase (all solo users) | `components/VoteControl.vue` (the two `v-if` branches), `stores/board.ts:78-83`, `phase-availability.ts:21-28` | #231 hid the buttons for bypassers; no replacement affordance | show the locked state with the reason **and** an "Open voting now" action when `bypassed`; same component, same copy for every role; `canOverride` on `Availability` |
| D2 | The in-tab relay accepts frames the real relay refuses (size above `MAX_FRAME_BYTES`, message rate) | `transport/local-relay.ts` (`send`), `apps/relay/src/relay-room.ts:59-72` | budgets are inline in the Durable Object, the local relay only reuses `EnvelopeBuffer` | move the budgets (`Budgets`, frame size, rate window) to `packages/protocol/src/budgets.ts` used by both; the local relay answers `{t:'err', code}` like the real one |
| D3 | The solo mark is capped at 50 rooms; the 51st solo board makes the oldest look shared, so `solo: isSolo(...)` is false and the board connects to the **real** relay and reseeds its whole local replica (encrypted) there | `utils/solo.ts:10` (`slice(-49)`), `pages/boards.vue:98`, ADR-0026 "reseed the real relay" | an LRU cap on a privacy flag | no cap; keep the mark for as long as the replica exists (store it next to the replica metadata); never connect a board to the real relay unless it is not solo or the owner converted it |
| D4 | Share button and invitation panel are shown in solo and give a link that opens an empty board for others (the room only exists in this tab); `unmarkSolo` exists and is never called, although ADR-0026 promises "share this solo board" | `components/ShareDialog.vue`, `components/AppToolbar.vue` (`btn-share`), `utils/solo.ts:11` | conversion never built | "Make this board shareable" flow: explain, `unmarkSolo`, reconnect with `solo: false`, then show the normal invitation (no passcode: it derives the content key, so adding one would make the existing events unreadable) |
| D5 | Live carry-over from the previous board always opens the real relay | `composables/useLiveCarryOver.ts:75` (`{ solo: false }`) | assumes the previous board is shared | if the previous room is solo, read its local replica instead of connecting |
| D6 | Participants menu may show relay or direct status for a board that has neither | `components/ParticipantsMenu.vue:97-99` (`board.links`), `plugins/ports.client.ts:59` (`p2p: false` for solo) | status block not guarded for solo | to verify first in task 5.1; show "Only you here" and no link modes in solo |
| D7 | Short join code hidden in solo (intended), but nothing says why | `stores/board.ts:88` | no explanation | covered by D4 (the conversion makes the code appear) |
| D8 | Name nudge skipped in solo | `components/NameNudge.vue:29` | intended (nobody to be known by) | keep; listed as a declared difference |
| D9 | No parity test of rules, only of feature presence | `tests/e2e/solo-parity.spec.ts` (two tests) | the test checks that dialogs open | a matrix of scenarios run in both modes |

## Declared differences (the only allowed ones)

No invitation link, code or QR until the board is made shareable; no passcode field at creation; no peer-to-peer and no relay status; no name nudge; "only you" as the participant list. Anything else that differs between the two modes is a bug.

## Decisions

- **One availability model for everyone**: `Availability` gets `canOverride` (= today's `bypassed`). The vote control renders the same locked state for every role; when `canOverride` it adds a labelled button "Open voting now" that sends `agenda.voteOpen` (the existing override, ending at the next phase change). Copy: en "Voting opens in the Vote phase. Open it now?", fr "Le vote s'ouvre à la phase Vote. L'ouvrir maintenant ?".
- **Budgets module** in `packages/protocol`: pure constants and a `checkFrame(size, now, window)` used by the Durable Object and the local relay; unit tested once, used twice.
- **Solo registry**: `utils/solo.ts` keeps a set without cap, persisted in localStorage next to the other retroboard: keys (it is read synchronously at page setup, which IndexedDB cannot do; the wipe in the profile clears it), and exposes `convertToShared(roomId)`.
- **Conversion** reuses the transport's reseed (ADR-0026): the first connection of a shared board already pushes the replica to the relay.

## Security and privacy note

The point of D3 is privacy: a solo board must never reach the relay by accident. After the change the real relay only ever sees a solo board after the owner converted it, and then it sees what it sees for any shared board (ciphertext, sizes, timings). No passcode is offered at conversion (see D4).

## Risks

- Users who relied on the missing vote button (to keep facilitators from voting early) lose nothing: the control is disabled until the phase opens or the override is used.
- The conversion is one-way for that tab (a shared board cannot become solo again); the dialog says so.
