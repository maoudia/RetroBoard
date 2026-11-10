# Proposal

## Why

Owner question (2026-11-08): "In solo board, why I can't vote? We should have same rules. Analyse the drifts."

ADR-0026 made solo and shared boards run the same ledger engine, and `solo-parity-and-dedup` (archived 2026-11-03) added a parity test. The domain rules really are the same: `packages/domain/src/voting/handlers.ts` does not know what a solo board is. The analysis (design.md) shows the drift sits in the layers around the engine:

1. **Why voting seems impossible in solo**: a new board starts with a running agenda by default. The one person of a solo board is its facilitator, and a facilitator *bypasses* the phase rules, so `VoteControl.vue` renders **nothing** for them outside the Vote phase: no button, no lock, no explanation (a participant would at least see a lock and the reason). The only way to vote is to know about "Vote open" in the vote bar or to wait for the Vote phase. A probe on a real solo and a real shared board shows the same behaviour in both: it is not a solo bug, it is an unexplained facilitator rule that hits **every** solo user and every "everyone facilitates" board.
2. Other solo-specific drifts the engine does not cover: the in-tab relay enforces none of the relay's budgets, the solo mark is silently dropped after 50 solo boards (the oldest then connects to the real relay), the Share button gives a link that cannot work, "Share this solo board" does not exist although the ADR promised it, a solo board cannot be a live carry-over source, and the participants panel may show relay or peer-to-peer status that does not exist.

## What Changes

- **Rule**: a solo board follows exactly the rules of a shared board; the only differences are the absence of other participants and of a network, and they are listed (no invitation, no passcode, no peer-to-peer, no relay status).
- **Voting explained for whoever can override the phase**: outside the Vote phase the vote control shows a disabled, labelled state with the reason and a one-tap "Open voting now"; the facilitator, the co-facilitators, everyone on an open board and the solo user see it.
- **Same budgets**: the in-tab relay applies the real relay's limits (frame size, message rate), from one shared module.
- **A solo board stays solo until its owner says otherwise**: the solo mark has no cap and no silent expiry; making a solo board shareable is an explicit "Make this board shareable" action that explains encryption (no passcode can be added afterwards: it derives the content key) and then forgets the solo mark.
- **Share button honest in solo**: it opens that action instead of an invitation that cannot work.
- **Carry-over from a solo board** reads its local replica.
- **Presence and links panel** say "only you" and show no relay or direct status in solo.
- **A parity matrix test**: the same scenario list runs solo and shared; the declared differences are the only allowed ones.

Out of scope: solo boards on several devices (they stay in one tab's storage), a hosted "private room" for solo, new voting rules (budget, caps) and the sealed ballot (`voting-v2-and-ranking`).

Bounded contexts: Voting, Facilitation (phase override), Access (roles), the web adapters of the transport. Free-plan budget: no extra relay traffic (the conversion reseeds the real relay once, as a shared board's first connection does).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`: the solo parity rule and the solo to shared conversion.
- `voting`: vote control explanation for those who can override the phase.

## Impact

- Web: `VoteControl.vue`, `VoteBar.vue`, `ShareDialog.vue` and its entry, `ParticipantsMenu.vue`, `utils/solo.ts`, `transport/local-relay.ts`, `composables/useLiveCarryOver.ts`, `plugins/ports.client.ts`.
- Packages: protocol (shared budgets module), application (vote availability read model gets a `canOverride` flag).
- Tests: e2e parity matrix, unit tests for the budgets and the solo registry.
