# Proposal

## Why

Owner scenario (2026-11-21): "Imagine Jira tickets have been imported into a RetroBoard board; then the facilitator launches a voting poker phase on that board." This is the owner's preferred shape of the integration between a retro and an estimation: not a poker room that a retro hands people to, but a phase of the board itself, on the same link, with the same encryption, passcode and people, in which each ticket gets a sealed round, and where the agreed estimate ends up on the ticket's note as a badge that stays in the board.

What exists today, read in the code of release 1.67.0:

- A board has a **phase machine**: `board.agenda` holds ordered phases of the kinds `checkin`, `review`, `write`, `group`, `vote`, `rank`, `actions` and `close` (`packages/domain/src/facilitation/agenda.ts`), each with a planned time and a table of what participants may do (`PHASE_COMMANDS`), run by the commands `agenda.set`, `agenda.start`, `agenda.next`, `agenda.advance`, `agenda.extend` and the rest, shown by `PhaseStepper.vue` and `AgendaRing.vue`. The change `phase-controls` makes what a phase allows a per-phase policy.
- A board has a **sealed vote** (`sealedBallot`, a ballot key, `vote.seal` and a facilitator's `vote.reveal`), and `scrum-poker` (ADR-0042) has sealed **rounds** with a key per round, a reveal, statistics, and an estimate decided by the moderator, in a separate room kind. A board folds no poker event today.
- A board can take **notes in batches** (`note.addMany`, at most 30 a batch through `createBoardCommands`, 300 notes a board) and **open actions in bulk** (`action.import`); `jira-estimation-import` specifies parsers that turn a pasted Jira list or a Jira CSV into rows (key, title, type, existing estimate, link), but it lands them in a room's story list, not on a board.
- A note shows **badges in its footer** (`.fbadge` for pinned and frozen, `.abadge` for the actions made from it), and the board's export, report and Jira layout (`export-hub`, `export-consolidation`, `jira-estimation-import` 3.1) leave through one door.

What is missing is the link: no way to put tickets on a board as notes and run a sealed estimation over them, keep the result with the ticket and send it back to Jira.

## Sequence

Owner decision of 2026-11-21: the standalone poker is kept and finished first, and the integration with the board comes after. The order of the four poker changes is: (1) finish the actual poker, group 6 of `poker-design-v2` (in progress, another worker); (2) `poker-deck-studio`; (3) `poker-in-retroboard`; (4) **`board-estimation-phase`, this change**. It is an additive follow-up and rewrites no released text. It reuses the cards, decks and skins of the second, the shared room tools, share panel and export of the third, and the rounds of `scrum-poker`; its first group (the end-to-end thin path) can start when `poker-deck-studio` has merged its groups 1 to 4 and `poker-in-retroboard` its groups 1 and 4 (theme parity is free on a board; export is the door it uses), and its later groups wait for the shared session of `poker-in-retroboard` only where they say so.

## What Changes

This change is the design and its spec, written first, with an ADR. It ships no application code; `tasks.md` is the implementation, ordered so that the end-to-end path (import tickets, start the phase, vote one ticket, the badge on the note, the Jira CSV) comes first.

- **A phase of the phase machine.** A new kind, `estimate`, joins the board's agenda: it has a planned time, appears in the stepper, can be added to an agenda, inserted after the current phase or started from the facilitator's menu, and is governed by the same policy and chain rules as the other phases. It does not turn the board into a poker room.
- **The tickets are notes.** Notes that look like tickets (a Jira key and a title, imported by the parsers of `jira-estimation-import`, or typed) enter the phase's queue from the columns the facilitator chooses, in the column's order, with skip, reorder, park and add.
- **Each ticket gets a sealed round.** The rounds, the key per round, the reveal, the statistics, the decision and the re-vote are the poker code of `scrum-poker`, reused unchanged and bound to a note by an `item` id. The deck and its cards are `poker-deck-studio`'s; the table, the hand and the results are `poker-design-v2`'s, composed with the board's own components.
- **The estimate is a badge on the note, kept in the board.** The decided card is stored by the note's id in the board's estimation state and drawn as a badge in the note's footer, survives edits of the note, and reaches the board's exports, the report and a CSV that goes back into Jira's import (key, estimate).
- **Same board, same people.** Everyone on the board is in the phase: no second link, key or passcode, the same presence, chat, timer and theme. A late joiner or a reload sees the phase as it is. Only the lead and the co-facilitators run it.
- **No consensus has a way out.** Vote again, park the ticket, or mark it to split; a special card majority (`poker-deck-studio`) points to the same exits.
- **The decision.** Where the state lives is decided in a new ADR (0045, proposed): the board's own ledger, in a field of its own, folded by the poker reducer, only during the phase. The alternative, a linked poker room per phase, is weighed in `design.md`.

Out of scope: a poker room that is also a board (ADR-0042 keeps them two kinds), estimating from the standalone room (`poker-in-retroboard`), importing from Jira over the network or writing to Jira (`jira-estimation-import` keeps paste, CSV and one human paste back), per-ticket decks, story points aggregated into velocity or capacity planning, estimating clusters or columns as items, converting T-shirt sizes to numbers for Jira, AI estimates, accounts, anything stored by us.

Bounded contexts: Facilitation (the phase kind and its rules, in `packages/domain/src/facilitation`), Estimation (the rounds, reused from `packages/domain/src/estimation`, and the queue), Ideation (the note badge and the ticket notes), Board session (the ledger field and the snapshot), Outputs (the export of estimates).

Relay traffic and the free-plan budget: each ticket costs the events of a poker round (about 28 for 20 voters: one start, the votes with changes, one reveal) plus one decision, and about 1.4 rounds a ticket; a 20-ticket refinement with 20 voters is about 830 events, under the 1,171 of ADR-0042's modelled poker hour, sent over the mesh with the relay as fallback. A retro's own events come on top; the relay buffer (2,000 envelopes or 4 MiB) is not reached by the estimation alone (about 0.6 MB), and peers re-seed beyond it as for any long board. Nothing is stored on our side. `design.md` "Budgets" has the arithmetic and the limits (30 notes a batch, 300 notes, 200 rounds a board).

Bundle budget: the entry chunk is at its 56.5 kB limit; the board page already carries the agenda, the stepper and the note card. The estimation phase view, the starter dialog, the queue and the exporters are lazy and load only when a board enters an estimation phase or opens the starter. The only entry change is the new phase kind in the shared agenda constants and the badge slot of `NoteCard`, which are a few bytes and which the first task measures and, if it must, asks a budget line for (`design.md` "Budgets").

## Capabilities

### New Capabilities

- `board-estimation`: the estimation phase of a board: starting it, the queue, a sealed round per ticket, the estimate badge, joining, facilitating, late joiners, tickets without consensus, the phase view and the result summary.

### Modified Capabilities

- `retro-agenda`: a phase kind `estimate`, its place in the agenda and its rules (delta in this change).
- `notes`: a note can carry an estimate badge (delta in this change).
- `export`: the board's export, report and a Jira CSV carry the estimates (delta in this change).
- `room-access`: poker commands are folded by a board during its estimation phase, from the lead and the co-facilitators only (delta in this change; it refines ADR-0042 as ADR-0045 records).

## Impact

- Changed: `packages/domain/src/facilitation/agenda.ts` (the kind and its table), `packages/domain/src/access/ledger.ts` (the `estimation` field, the routing of poker bodies during the phase, the privilege rule, `LEDGER_VERSION` 2), `packages/domain/src/estimation/` (an `EstimationState` that wraps `PokerState` and the reducer, which stay untouched), `packages/domain/src/snapshot.ts` and the snapshot schema in `packages/protocol`, `packages/protocol/src/v1.ts` and `poker.ts` (the new tags), `packages/application/src/read-models/phase-stepper.ts` and `phase-availability.ts`, `apps/web/app/components/NoteCard.vue` (the badge), `PhaseStepper.vue`, `AgendaEditor.vue`, `AppToolbar.vue` (the facilitator's entry), `ExportDialog.vue`, `ReportView.vue`, the board page (the phase view), `tests/e2e`.
- Added: `components/estimation/` (`EstimationPhase`, `EstimateQueue`, `EstimateStarter`, `EstimateBadge`: compositions of existing components and of `PokerCard`, `PokerTable`, `PokerHand`, `PokerResults`), the ticket-import target of the importer of `jira-estimation-import` for a board, the board-to-Jira CSV writer, `docs/adr/0045-...md`.
- Docs: `docs/architecture.md` (the estimation field of the ledger), `docs/design-system.md`, `docs/DEVELOPMENT.md`, the user guide in fr and en and its manifest (`tests/docs/manifest.ts`) regenerated with `pnpm docs:tour && pnpm docs:guide`, `docs/adr/README.md` (generated), ADR-0042's More Information (a pointer).
- Not changed: the relay, the envelope, the genesis, the board's other commands, the poker room kind and its rules, the sealed vote of a board, CSP, the themes package, the vault format.
