# Design

## Context

`settings.openFacilitation` already exists (ledger.ts): when true, any participant may run privileged commands, and `roleOf(...) !== 'participant' || openFacilitation` also skips `allowedInPhase`. The owner wants open facilitation as the default and still wants the agenda to mean something.

## Decisions

### D1. Default true for new boards, stored values kept

`board.create` writes `openFacilitation: true` unless the setup form says "One facilitator". Boards created before this change replay with their own `settings.update` events, so nothing changes for them.

### D2. Two predicates instead of one

- `canRunPrivileged(ledger, key)`: facilitator, co-facilitator, or open board.
- `bypassesPhaseRules(ledger, key)`: facilitator or co-facilitator only (never because the board is open).

On an open board, a participant can start the vote phase (privileged) but cannot add a note during it (phase rule). Facilitator link holders keep bypassing phase rules, as today.

### D3. Mode switch needs the capability key

`settings.update` carrying `openFacilitation` is accepted only from a key in `ledger.facilitators` (the facilitator capability), even on an open board. Every other privileged command stays open. This avoids a "who leads now" state when a participant closes facilitation: the mode only changes from someone who holds the facilitator link, and that person is the lead (single-facilitator rules).

### D4. UI on an open board

No crown, no "lead" wording, no takeover dialog. Every participant sees the facilitation bar. The share panel shows the participant link; the facilitator link is under "Advanced" with the text "Needed only to switch to one facilitator".

## Risks

- A participant can end a phase early for everyone. Accepted: that is what "everyone facilitates" means; the phase-end popup (phase-end-notifications) shows who moved the phase.
