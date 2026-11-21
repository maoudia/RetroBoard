# Design

Design first: this change specifies an estimation phase for a board whose notes are tickets, and the decision about where its state lives. It ships no code. It is checked against `docs/PLAN.md`, `openspec/config.yaml`, ADR-0004, ADR-0005, ADR-0006, ADR-0021, ADR-0037, ADR-0042 and the new ADR-0045 (proposed, written with this change), the specs in `openspec/specs/`, and the code of release 1.67.0 (commit `f45f547f`).

Sequence (owner decision of 2026-11-21): (1) finish the actual poker, group 6 of `poker-design-v2`; (2) `poker-deck-studio`; (3) `poker-in-retroboard`; (4) **this change**. It is an additive follow-up and rewrites no released text; "What this replaces once it is implemented" says what it changes in the older text when built. It is the owner's preferred shape of the integration, so `poker-in-retroboard` (S7 there) and `poker-deck-studio` are written to be consistent with it: the cards, decks and skins are the second change's, the shared room tools, share panel, library and export the third's, and the rounds `scrum-poker`'s.

Marks in the wireframes: `[E]` an existing component or class of the product today (named), `[P]` a component of the standalone poker once the earlier changes of the sequence are built (`PokerCard`, `PokerTable`, `PokerHand`, `PokerResults`, `DeckGallery`), `[N]` new in this change. Everything not marked is plain content.

## What exists, and what the owner asks

The ask, in the owner's words (2026-11-21): imagine Jira tickets imported into a RetroBoard board, then the facilitator launches a voting poker phase on that board; it reuses the poker round machinery of `scrum-poker` and ADR-0042 without turning the board into a poker room; the agreed estimate is written back onto the ticket note as a visible badge and kept in the board; people join from the same board link with the same encryption, passcode and presence; the result is summarised and exported through the existing hub, including a CSV that goes back into Jira's import.

| What | Where it lives today | Used here |
|---|---|---|
| The phase machine | `packages/domain/src/facilitation/agenda.ts`: `PHASE_KINDS` (`checkin`, `review`, `write`, `group`, `vote`, `rank`, `actions`, `close`), `Phase`, `AgendaState` (`current`, `startedAt`, `pausedAt`, `rules`, `autoPublish`, `chain`, `voteOpen`), `PHASE_COMMANDS`, `phaseAllows`, `allowedInPhase`, `phaseClock`, `extendPhase`; commands `agenda.set`, `.start`, `.pause`, `.next`, `.prev`, `.advance`, `.extend`, `.end`, `.restart`, `.options`, `.clear`, `.voteOpen`, `.toClose` | The new kind joins it; the clock, the stepper and the chain apply |
| The stepper and the agenda editor | `PhaseStepper.vue`, `AgendaRing.vue`, `AgendaEditor.vue`, `PhaseEndPopup.vue`, `usePhaseEnd.ts`, `read-models/phase-stepper.ts`, `phase-availability.ts` | The phase shows in them; the end popup and the availability cues apply |
| What a phase allows | `PHASE_COMMANDS` now; a per-phase capability policy in `phase-controls` (a change, `Phase.policy`, `agenda.policy`) | The estimate phase has a preset policy and uses the same lookup |
| A sealed vote on a board | `sealedBallot`, `ballotKey`, `vote.seal`, `vote.reveal` (`packages/domain/src/voting/sealed.ts`, `packages/crypto/src/ballot.ts`), the voting phase and `VoteBar.vue` | The pattern (sealed, revealed by the facilitator) is the same; the poker rounds replace it for tickets |
| Sealed rounds with a key per round | `packages/domain/src/estimation/poker.ts` `reducePoker`, `packages/crypto/src/poker.ts` (`roundKeyPair`, `sealCard`, `openCard`), `packages/application/src/estimation` (decks, statistics, `openRound`), `Ledger.poker`, ADR-0042 finding 2 | Reused unchanged for the rounds |
| Notes in batches, open actions in bulk | `note.addMany` (`NewNote[]`, `LIMITS.maxBatch` 30, `createBoardCommands` in `packages/application/src/board/commands.ts`), `LIMITS.maxNotes` 300, `LIMITS.noteText` 500, `column.add`, `action.import` | The way tickets land on a board |
| Jira rows | `openspec/changes/jira-estimation-import`: parsers in `packages/exporters` (Jira CSV, rich-clipboard table, tab-separated text, keys and links), rows of key, title, type, existing estimate and link; its dialog and its "Copy for Jira" writer (task 3.1) | The parsers and the writer are reused; the dialog gets a board target |
| The note's footer | `NoteCard.vue`: `.fbadge` (pinned, frozen), `.abadge` (actions from this note), the vote control and the menu | The estimate badge is one more pill of this footer |
| The export door | `ExportDialog.vue`, `ExportMenu.vue`, `packages/exporters`, `ReportDialog.vue`, `ReportView.vue`; `export-hub`, `export-consolidation` | Estimates ride in it; "Estimates only" is a filter |
| The snapshot | ADR-0037, `LEDGER_VERSION` in `access/ledger.ts` | The version becomes 2 (S2) |
| Roles and open facilitation | ADR-0005, ADR-0021; `canSteer`, `roleOf`, `openFacilitation` | The privilege rule (S7) |

What does not exist and is built here: the `estimate` phase kind, the ledger field, the queue, the badge, the board target of the importer, the phase view and the Jira writer for a board.

## Principles

| Principle | Rule |
|---|---|
| A phase, not a room | The board stays a board: same link, key, passcode, presence, chat, timer, theme and export; the estimation is one more phase of its agenda |
| One implementation of rounds | The sealed rounds, the reveal, the statistics and the decision are the poker code, unchanged |
| The estimate is the ticket's | It is state keyed by the note, shown as a badge, kept in the board, and exported with it |
| Reuse first | Existing components and tokens first, `poker-design-v2`'s table, hand and results second, new surfaces only for the phase's composition |
| Safe for older clients | Every new wire shape is a tag or a value an older client keeps as unknown or refuses, never mis-reads, and the "newer version" notice follows |
| Facilitated by the facilitators | The lead and co-facilitators run it, even on an open board |
| Nothing to us, nothing in the clear | Zero infrastructure, no storage on our side, E2E; a ticket and an estimate are content |

## Decisions

### S1. Where the round state lives: the board's ledger or a linked poker room

The question the owner asks to be stated clearly. Three options were weighed:

| | A. The board's own ledger hosts an estimation field, folded by the poker reducer, during the phase | B. The phase starts a linked poker room and writes the result back | C. The estimate is only a text edit of the note, no sealed rounds |
|---|---|---|---|
| Same link, key, passcode, presence | Yes, by construction | No: a second room id, key and passcode, handed out by sealed frames to the people present; late joiners and reloads need the link kept somewhere | Yes |
| Late joiner and reload | The board's replay or snapshot carries the phase | The pointer to the room must be stored (a board event holding the room key in the board's ciphertext) or lost | Trivial |
| Sealed votes, key per round | Yes: the poker rounds | Yes: the poker rounds | No: there is no vote, someone types a number |
| Estimate with the ticket, in exports and the report | Yes: stored by note id in the board | Written back by a cross-room write: the room's device needs the board's key and the right to write, and it can fail | Yes, in the text |
| Touches the shared fold | Yes (S2): a ledger field, a routing rule, a version bump | No | A little |
| Older clients | Unknown tags kept; an agenda with the new kind is kept as unknown (S2) | Nothing breaks; the room needs the new page | Nothing breaks |
| Two copies of the truth | One | Two (room and board) that must be reconciled | One |
| Chat, timer, theme, presence, share | The board's own | A second set, or the allowlist of `poker-in-retroboard` | The board's own |
| Cost to build | A ledger field and a fold rule; the phase view | A hand-off, a pointer, a write-back, a second room to secure | Almost none |
| What it gives the owner | Exactly the scenario | A room that looks like a phase | A badge with no estimation behind it |

**Recommendation: A**, recorded in ADR-0045 (proposed). The board's ledger gains an `estimation` field next to `board` and `poker`; the board's genesis and `kind` do not change; the poker reducer and the poker wire are untouched. B is the right shape for an estimation with people who are not on the board, which is the standalone poker room and its "Estimate in a room instead" entry (`poker-in-retroboard`), and the two coexist. C is not an estimation.

**What the ADR decision changes.** ADR-0042 decided that a poker room is a second room kind and that "a room folds the content of its own kind and nothing else". This change does not reverse it (the kind, the genesis rule, the privilege set, the cap and the relay's blindness stand) and adds one exception: a board folds estimation bodies while its running phase is an estimation phase. That differs from the letter of ADR-0042, so it gets its own ADR (0045) rather than an edit of 0042, which gets a pointer in its More Information.

### S2. The ledger, the wire and the snapshot

```
Ledger (existing)               + estimation?: EstimationState   (new, absent until a phase starts)
  board: BoardState               poker?: PokerState             (rooms only; untouched)

EstimationState (domain, pure, packages/domain/src/estimation/)
  poker:     PokerState                    the seats, the deck, the look, the rounds (the poker reducer, unchanged)
  sources:   string[]                      the column ids the queue was made from
  queue:     string[]                      note ids still to estimate, in order
  current:   string | null                 the item of the open round, or the next one
  items:     Record<roundId, noteId>       which ticket each round estimates
  estimates: Record<noteId, Estimate>      the decided estimates
  flags:     Record<noteId, 'parked' | 'split'>

Estimate = { card: string, round: string | null, by: string, at: number, source: 'round' | 'import' }

EventBody (existing)  + EstimationBody { t: 'estimation', cmd: EstimationCommand }
EstimationCommand =
    a poker command, unchanged: seat.join | settings.update{deck,autoReveal,hue} | deck.style | round.start{round,pub,revote?} +item | vote.seal | round.reveal | estimate.decide
  | queue.set { items, sources, deck? } | queue.add { items } | queue.move { item, to } | queue.skip { item } | queue.pick { item }
  | item.flag { item, flag: 'parked' | 'split' | null } | estimate.set { item, card, source } | estimate.clear { item }
```

- **One body tag.** Every estimation command of a board, the poker ones and the queue ones, travels in `estimation`. A poker room's wire, `PokerCommandSchema` and `Round` do not change, and the item of a round is kept in `items`, not in `Round`. A `round.start` here also names its `item`.
- **Routing in the fold.** `foldEvent` accepts an `estimation` body only if the ledger is a board (a poker room ignores it) and the running phase is an estimation phase (`agendaRunning(a)` and `phases[current].kind === 'estimate'`); every other time, from anyone, it is ignored by every replica. The poker commands are handed to `reducePoker(estimation.poker, cmd, actor)` with the actor's moderator flag set by the board's roles (S7); the queue commands are folded by the estimation reducer. A round whose `item` is not in the queue (or whose note is gone) is refused.
- **Version.** `LEDGER_VERSION` becomes 2 (ADR-0037: a joiner trusts a signed snapshot only if it was made with its own rules). A version-1 client and a version-2 client do not share snapshots; they fall back to the history, as ADR-0037 says.
- **Snapshot content.** A snapshot carries the queue, the flags, the estimates and, for each revealed round, its item, deck and verdict; **never an open round's ballots**, and none is cut while a round is open (the cutter waits for the reveal, a decision, a park or the phase end). A late joiner after a snapshot sees the phase as of that point and replays the events since; a joiner with no snapshot replays all.
- **Older clients.** An `estimation` body is an unknown tag to them: kept, forwarded, not folded, with the "newer version" notice (`parseEventOrUnknown`, `keepNewer`), as ADR-0042 says for poker bodies. An `agenda.set` that contains the kind `estimate` is refused by the old picklist, which would silently drop it and let that client's agenda diverge; task 1.1 therefore makes the parser treat an agenda whose only problem is an unknown phase kind as an unknown event (kept, forwarded, notice), with a test. People on an older version are shown the notice and reload; the pages are served with `no-cache`.
- **Limits.** At most 100 items in a queue, 200 rounds in a board (`MAX_ROUNDS`, so about 140 tickets at 1.4 rounds each), notes and batches as the board's (`maxNotes` 300, `maxBatch` 30), an estimate card of at most 6 characters (a card of the deck).

### S3. The phase in the phase machine

- **A new kind.** `PHASE_KINDS` gains `estimate`. Its table row is `[]` for board commands: nobody writes, groups or moves notes in it; chat and the presenter announcement stay always allowed, as they are in every phase (`allowedInPhase`). Estimation bodies have their own check (S2). It is not in the four agenda presets (30, 45, 60, 90 minutes), so every existing retro and every creation preset is unchanged; it is added by the facilitator.
- **Three ways in.**
  1. In the agenda editor (`AgendaEditor.vue`), like any phase, with minutes (a refinement format puts it after Write).
  2. From the facilitator's menu, "Estimate tickets...": if the agenda has an `estimate` phase it advances to it (`agenda.advance`); if it has not, one is inserted after the current phase with the rest of the agenda kept (an `agenda.set` of the new list, which the running-agenda rules already allow for the facilitator, verified in task 1.1); on a board with no agenda, a one-phase agenda is created and started.
  3. From a column's menu (`ColumnMenu.vue`), "Estimate this column", which does 2 with that column preselected.
- **Rules and policy.** The preset policy of `phase-controls` for `estimate`: *estimate* (play a card) on for participants, *write, group and move, vote, edit actions* off, *freeze* on (the ticket notes are read-only for participants so a ticket cannot change under a round; facilitators may still edit). In simple mode nothing is shown; in advanced mode the Phases section lists the switches as for any phase. With rules off, the board's other commands are open as in any phase; the estimation privilege rule (S7) still holds.
- **One estimate phase.** An agenda holds at most one; a second pass re-enters it (`agenda.prev`, `agenda.restart`, "Estimate tickets..." when the phase is behind), and the estimation state continues where it was.
- **Chain and clock.** The planned time, the overtime colour, `agenda.extend` with borrowing, the auto-chain and the phase-end popup apply as to any phase; a chain that would leave the phase while a round is open stops at the reveal and asks (below).
- **Leaving with a round open.** An open round at the end of the phase (by `agenda.next`, `end` or the chain) is **abandoned**: its ballots stay as sealed events and are never revealed, its item returns to the queue, and the facilitator is asked first in a `ConfirmDialog` ("A round is open. End the phase anyway?"), as for a destructive step.
- **The stepper.** `PhaseStepper.vue` shows "Estimate" like any phase and, while it runs, "Ticket 3 of 12" in place of the plain time label; `phase-availability.ts` gains the cue "Estimating" (the board's other tools are muted as in any phase that does not allow them).

### S4. Tickets onto the board

A ticket is a note. Its text is `KEY Title` (a Jira key at the start, a space, the title), at most 500 characters (`LIMITS.noteText`), and the key is read with `^[A-Z][A-Z0-9_]+-\d+\b`; a note with no key is still an item (the text is its summary) and is exported with an empty key and a count.

What exists to put tickets on a board:

| Path | What it does | Status |
|---|---|---|
| Type or paste notes | The composer and the drafts publish notes one by one or by `note.addMany` | Exists |
| `note.addMany`, 30 a batch, 300 a board | Batch notes in `createBoardCommands` (`packages/application/src/board/commands.ts`) | Exists |
| The parsers of `jira-estimation-import` (tasks 1.1 to 1.2) | A pasted Jira list, a Jira "export CSV" file or a list of keys becomes rows (key, title, type, existing estimate, link) with row errors and hostile-input limits | Specified, to be built |
| The importer dialog of `jira-estimation-import` (task 2.1) | Paste, drop a file, preview with row errors, idempotent by key, a cap | Specified for a room's story list |
| `action.import` | Carries open actions in bulk | Exists, for actions |

**What this change adds: a board target for the same importer.** The dialog and the parsers are `jira-estimation-import`'s; this change adds the target: "Import tickets" in the board's menu (facilitator, in the Write or any phase the rules allow, or with rules off), which shows the same preview and then publishes `note.addMany` batches of at most 30 into a column named "Tickets" (created with `column.add` when absent, one of the board's 8 columns), the title as the text, idempotent by key (a note whose text already starts with that key is updated in place by `note.edit`, never duplicated), capped at the board's 300 notes with a message. Imported text is content: never logged, never used as an instruction. A Jira row's existing estimate becomes `estimate.set { source: 'import' }` once the phase has started, so that "was 5" is shown and a round can replace it. The same format also exists as a template: **Backlog refinement** (one column "Tickets", an agenda of Write 10 minutes, Estimate 40, Close 5) in the format picker (`catalogue/templates.ts`).

Until the importer of `jira-estimation-import` exists, tickets are typed or pasted as notes (one per line through the composer), which is how any note gets on a board; the first group's end-to-end test uses that path and the importer's rows when they are built.

If the person gave the Jira site (the setting of `jira-estimation-import` 2.3), the key in a ticket note is shown as a link that opens in a new tab with `rel="noopener noreferrer"`, `https` only, to that site only.

### S5. Starting the phase: which notes enter, in what order

The starter is a `BaseDialog` ("Estimate tickets"), opened from the three entries of S3:

1. **Which notes.** The board's columns with their note counts as checkboxes. Preselected: the column named by the import, else the columns where most notes carry a key, else the first. Options: "Include open actions" (an action is an item too, by its id; off), "Include notes that already have an estimate" (off). Always excluded: drafts (never published), notes inside a cluster (a cluster is not an item in this change; its notes are listed under it with "Estimate the notes of this cluster" off), and notes of hidden columns.
2. **Order.** The column's display order: pinned notes first, then by creation (the order `buildColumnItems` shows), columns in the order picked. The queue is built from this and frozen to ids at `queue.set`.
3. **The deck.** `DeckGallery` of `poker-deck-studio` (a hero fan and tiles, Fibonacci by default, the team's default when it has one), written as `settings.update { deck }` and `deck.style { look }` in the estimation state.
4. **Start.** "Start the estimation" (the one filled button): `queue.set { items, sources, deck }`, the phase starts or is inserted (S3), the first item becomes `current`.

During the phase the queue is a list the facilitator keeps: **current** is the first item not decided, parked or split; **skip** moves an item to the end; **pick** makes any item current next; **reorder** by drag, by keys and by Earlier and Later buttons (WCAG 2.5.7, as the deck builder); **add** appends notes later (new tickets arriving during the session); **park** and **split** flag an item and take it out of the queue; **requeue** puts a parked item back. A note deleted by a facilitator leaves the queue with its estimate kept as an orphan that exports and cleaning ignore. The list is the `EstimateQueue` panel.

### S6. A sealed round per ticket

The flow, one ticket (the same machinery as a room, `scrum-poker` and ADR-0042):

```
item current -> round.start (opener = the device of whoever starts it, a facilitator)
   -> seats play sealed cards (vote.seal, one per voter, changeable until the reveal)
   -> round.reveal (the opener's device publishes the round key; every replica opens every ballot)
   -> results: average, median, distribution, verdict, outliers, special-card lines
   -> decide:  estimate.decide  -> estimates[item]  -> next item
               Vote again       -> round.start { revote }   (same item, a new key)
               Park / Split     -> item.flag                (out of the queue)
```

- **The round key.** `HKDF(opener's secret, salt = room id, info = "rb/poker/round/v1|<round>")` as in ADR-0042; on a board the opener's secret is the facilitator link's, which a facilitator's device holds, so a reload or a `role.claim` keeps it; the round's public key is in `round.start`, the private half is published at the reveal. Nothing else is needed from the board's own sealed ballot (`ballotKey`), which the voting phase keeps for its own use.
- **Seats.** Voters are the first 20 seats in log order (ADR-0042 cap), later seats watch; a seat is made by `seat.join` when a person's client first shows the phase view (S8). A voter who arrives in the middle of a round can play in it. The auto-reveal counts a pass as a ballot (`poker-deck-studio`).
- **Statistics, special cards, outliers, "Use 5".** Unchanged: the application's `roundStatistics`, `consensusLevel`, `outliers` and the special-card signals; "Use 5" is `estimate.decide`; the verdict decides which button is filled (`poker-design-v2` K9: Next when the room agrees, Vote again when it does not).
- **The decision writes the estimate.** `estimate.decide { round, card }` sets `estimates[items[round]] = { card, round, by, at, source: 'round' }`, removes the item from the queue and makes the next one current; a later decision on the same item (after a re-vote) replaces it.
- **No consensus.** At the reveal, with some or no agreement, "Vote again" is filled; "Use X anyway" (the suggestion) stays quiet; the overflow menu of the decision has **Park** (out of the queue, a "Parked" badge, requeue later) and **Split** (out of the queue, a "To split" badge). A special-card majority offers the same exits: "Most say: split it" fills **Split**, "Most say: already known" offers "Close without an estimate", "Needs more information" fills Vote again after the discussion. Splitting does not create tickets in this change.
- **The talk and the timer.** "Please explain" for an outlier is the board's own `talk.assign`; the phase's clock and the room's timer are the board's (`TimerWidget`, `AgendaRing`), already present on a board.

### S7. Who may facilitate

- The lead facilitator and co-facilitators (the ledger's `facilitators`) run the phase: start and end it, set the queue, start rounds, reveal (from the device that opened the round), decide, flag, requeue and clear.
- **The open-facilitation switch does not extend to estimation.** On an "Everyone facilitates" board (the default of ADR-0021) the board's other privileged commands stay open to everyone, but the estimation's privileged commands are accepted only from `facilitators`, because a reveal belongs to the device that holds a round's key and an open reveal would let anyone decide a ticket. A facilitator can `role.delegate` a co-facilitator to share it. This is stated in the privilege table, tested, and shown in the starter ("Only facilitators run the estimation. Everyone votes.").
- **Everyone** plays a card (`vote.seal`), joins (`seat.join`), chats and uses the timer's read side.
- **A moderator change in the middle of a round** (`role.handover`, `role.claim`) starts a new round for the same item, because the round key stays with its opener (ADR-0042).
- A participant cannot reveal, decide, flag, reorder or start a round; every replica ignores it.

### S8. Joining the phase from the same board link

There is nothing to join in the sense of a room: everyone on the board is already in its room, with its key, passcode and presence. When the phase starts, every board page shows the phase view; a `.seg` ("Board | Estimation") lets a person look at the board without leaving the phase. A person's client sends `seat.join` the first time it shows the phase view, with the name and hue of the board's identity (`participant.self`, `useIdentityStore`), so the seat appears with the right name and avatar. Observers (past 20 voters) watch with no dock.

- **Late joiners.** A person who opens the board link during the phase replays the board (or loads a snapshot of version 2) and sees the phase as it is: the queue with its states, the estimates as badges, the current ticket and, if a round is open, the table with voted marks and no card values; they can play in the open round.
- **Reload.** The replica holds the events; the voter's own card is sealed on the device (as in a room, `poker-in-retroboard` 5.2) and sent again if the relay forgot the round.
- **Presence.** The seat's dot is the board's presence (here, away, reconnecting). Peer-to-peer links and the relay fallback are the board's.
- **Same passcode and encryption.** The events are encrypted with the board's room key (and passcode) like any other; the relay sees an envelope of five fields and learns neither the phase nor the kind.

### S9. The estimate as a badge on the note, kept in the board

- **Stored** in `estimation.estimates` by note id, in the board's ledger and replica, so it travels with the board (sync, vault, library, `.rbv`), survives edits of the note's text, and is part of a version-2 snapshot.
- **Shown** as one more pill of the note's footer (`NoteCard.vue`, next to `.fbadge` and `.abadge`, the same footprint and the same colour logic): a small `PokerCard` face with the card's label (and its special glyph for a parked or split flag), with the accessible name "Estimate: 5" or "Parked" or "To split". It is visible to everyone, in every phase, on a phone and on a TV, and it is not shown on a note that has none. A jira-imported estimate shows as "was 5" muted until a round decides.
- **Edited** only by the facilitators: `estimate.decide` in a round, `estimate.set` (a typed or imported value, source `import`) and `estimate.clear`, each an event in the log, so history and the activity feed list them ("Alex set 5 on PROJ-123").
- **Orphans.** An estimate of a note that was deleted stays in the state, is not drawn, and is dropped from exports.

### S10. The phase view, on a phone and on a desktop

The view is a composition of the board's own components and the standalone poker's. New files: `EstimationPhase`, `EstimateQueue`, `EstimateStarter`, `EstimateBadge` (a `PokerCard` in a footer pill), made only of the parts named.

```
Phone, 390x664, estimation running, a round open (the moderator)
+--------------------------------------+
| [E] AppToolbar: boards, timer, tools |   [E] AppToolbar, TimerWidget
| [E] Write > ESTIMATE > Close  41:12  |   [E] PhaseStepper
| ( Board | Estimation )               |   [E] .seg
|  Ticket 3 of 12              (Queue) |   [N] EstimationPhase header, [E] .btn-sm
|  +--------------------------------+  |
|  | PROJ-123                       |  |   [E] NoteCard (the current ticket)
|  | Login fails after the reset    |  |
|  | Ann                  [was 5]   |  |   [N] EstimateBadge in the footer
|  +--------------------------------+  |
|  (MA)[bk] (AN)[bk] (BO)[  ] (CY)[  ] |   [P] PokerTable seats (compact grid)
|  2 of 6 voted                        |   [P] status line
+--------------------------------------+
|  [ (eye) Reveal ]                    |   [P] dock, [E] .btn .btn-primary
|  [0][1][2][3][5][8][13]              |   [P] PokerHand
|  [21][34][55][89] | [?][|/]          |   [P] PokerCard
+--------------------------------------+
```

```
Phone, revealed, no agreement
+--------------------------------------+
| [E] AppToolbar ... [E] PhaseStepper  |
|  Ticket 3 of 12                      |   [N]
|  | PROJ-123  Login fails ...      |  |   [E] NoteCard (compact)
|  (MA)[ 8] (AN)[ 5] (BO)[ 5] (CY)[13] |   [P] seats, face up
|  Average 7.2   Median 5              |   [P] PokerResults, [E] ChartGauge, ChartBars
|  Some agreement  [=====-----] 50%    |
|  Highest: 13 (Cy)                    |
+--------------------------------------+
|  [ (undo) Vote again ]   [ ...  ]    |   [E] .btn .btn-primary, [E] Dropdown: Use 5, Park, Split
+--------------------------------------+
```

```
Desktop, 1280x800, the moderator
+--------------------------------------------------------------------------------+
| [E] AppToolbar                                                  [E] TimerWidget |
| [E] PhaseStepper:  Write  >  ESTIMATE  >  Close                     Ticket 3/12 |
+----------------------+-------------------------------------------+-------------+
| [N] EstimateQueue    | [E] NoteCard: PROJ-123 Login fails ...    | [P] results  |
| ( ) PROJ-120  [5]    |                                           | Average 7.2  |
| ( ) PROJ-121  [3]    |  [P] PokerTable (oval)                    | Median  5    |
| (*) PROJ-123  voting |   (AN)[bk]   (BO)[bk]                     | Some agree-  |
| ( ) PROJ-124         |  (CY)[  ]  Round 1  (DE)[  ]              | ment 50%     |
| ( ) PROJ-125  parked |        (MA)[bk]                           | Highest 13   |
| [E] .panel-row rows  |  [ (eye) Reveal ]                         | [ Use 5 ]    |
+----------------------+-------------------------------------------+-------------+
|        [P] PokerHand: [0] [1] [2] [3] [5] [8] [13] [21] [34] [55] [89] [?] [|/] |
+--------------------------------------------------------------------------------+
```

```
The board view during and after the phase: the badge in each ticket's footer
+--------------------+ +--------------------+ +--------------------+
| PROJ-120 Search... | | PROJ-121 Export... | | PROJ-125 Mobile... |   [E] NoteCard x3
| Ann        [ 5 ]   | | Bo         [ 3 ]   | | Cy        [parked] |   [N] EstimateBadge (PokerCard face)
+--------------------+ +--------------------+ +--------------------+
```

```
The starter, phone (a BaseDialog)
+--------------------------------------+
| [x]  Estimate tickets                |   [E] BaseDialog
|  Which notes                         |
|  [x] Tickets (12)   [ ] Ideas (5)    |   [E] .chip checkboxes with counts
|  [ ] Include open actions            |   [E] ToggleSwitch
|  [ ] Include already estimated       |   [E] ToggleSwitch
|  Deck                                |
|  {fan} Fibonacci  (change)           |   [P] DeckGallery
|  Only facilitators run it.           |
|  [ (play) Start the estimation ]     |   [E] .btn .btn-primary
+--------------------------------------+
```

On a TV the view scales its content by `--type-scale` as the poker room does (`poker-design-v2` K8) and hides the dock for a person who only watches; in presentation the join QR of `PresenterJoin` is the board's. The chat dock, the timer and the share dialog are the board's.

### S11. Results and export

- **Summary.** At the end (or at any time from the phase view): tickets estimated of the queue, parked, split, the total of numeric estimates, the rounds taken, the longest to agree. It is a panel in the product's list pattern (`.panel-row`) and the closing card of the phase.
- **The export hub.** The board's export dialog gains an "Estimates" content: in Markdown a table (key, title, estimate, rounds, verdict) and the parked and split lists; in JSON an `estimation` section (queue, estimates with source, flags, rounds with verdicts, no per-voter card); in CSV an estimate column; in the report (`ReportView.vue`) an "Estimation" section (the estimates table, the rounds-to-consensus trend through `ChartBars`, the parked and split lists, participation as a count). "Estimates only" is a filter on every destination beside "actions only". **Per-voter cards are not exported** unless the person turns on "Include who voted what" for that export (`poker-in-retroboard` S8).
- **The CSV that goes back into Jira.** "Estimates for Jira" in the export dialog (the writer of `jira-estimation-import` 3.1, fed by the board): columns `Issue key`, `Summary`, `<estimate field>` (Story Points by default, the name asked once and remembered), one row per decided ticket, the key read from the note, the estimate the decided card; formula-like cells neutralised as for every CSV; a note with no key is left out with a count ("2 tickets have no Jira key"); a non-numeric deck (T-shirt, time) writes the card's label and the dialog says that Jira's Story Points field expects numbers; the file re-imports through the parsers of `jira-estimation-import` unchanged. Writing the estimate into Jira stays a human action (Jira's CSV import or bulk edit), as `jira-estimation-import` and ADR-0043 say: no token, no network call.

### S12. What this replaces once it is implemented

This change is an additive follow-up and rewrites no released text now. When its tasks are implemented, the pull request of each amends the older text it replaces:

| Older text | Replaced by, and when |
|---|---|
| `jira-estimation-import` proposal "into the room" (its dialog lands rows in a room's story list), task 2.1 | The same dialog with a second target, a board's "Tickets" column (task 1.2 here); the room target stays |
| `poker-in-retroboard` S7 (the entry points and the write-back through a device hand-off) | The entries start this phase; "send estimates to the retro" writes `estimate.set` events into the board's estimation state |
| ADR-0042 rule "a room folds the content of its own kind and nothing else" | ADR-0045 (proposed): a board may fold estimation bodies during an estimation phase |
| `phase-controls` presets table | A row for `estimate` (this change's task 2.4, when `phase-controls` is built) |
| `scrum-poker` proposal "A poker room is a second kind of room" and design "Option chosen" | Unchanged: a room stays a kind; the board phase is a second way, recorded in ADR-0045 |

### S13. Where each new type lives

| Piece | Layer |
|---|---|
| `EstimationState`, `Estimate`, the queue commands and their reducer, the routing predicate `estimationRunning`, the privilege rule | `packages/domain/src/estimation/` (new `estimation.ts`; pure; imports the poker reducer, nothing from the board contexts except the ledger's `facilitators`) |
| The `estimate` phase kind and its table row | `packages/domain/src/facilitation/agenda.ts` |
| The `estimation` field, the routing in `foldEvent`, the version | `packages/domain/src/access/ledger.ts`, `snapshot.ts` |
| The wire body, the unknown-kind treatment of `agenda.set` | `packages/protocol/src/v1.ts`, `poker.ts` (new schema next to it), `parseEventOrUnknown` |
| The queue builder (which notes, in what order), the summary, the Jira rows and the CSV | `packages/application/src/estimation/` (pure) |
| The board target of the importer, the starter, the phase view, the queue, the badge | `apps/web/app/components/estimation/`, `NoteCard.vue`, the board page, `ColumnMenu.vue`, `AppToolbar.vue` |
| The export content, the report section | `packages/exporters`, `ExportDialog.vue`, `ReportView.vue` |
| Transport, replica, relay, mesh, presence, passcode | The board's, unchanged |

## Budgets

Relay and free plan. Inputs from ADR-0042 finding 3 and `docs/capacity.md`: an event up to 16 KiB (a vote about 704 bytes), the relay keeps 2,000 envelopes or 4 MiB, a socket may send 80 board frames in 10 seconds (a client paces at 40), the mesh is complete to 12 people and 7 to 8 links above, the free plan bills incoming WebSocket messages at 20 to 1 and allows 100,000 requests a day.

| Quantity | Arithmetic | Result |
|---|---|---|
| Events of one round, 20 voters | 1 start + 26 votes (30% change once) + 1 reveal | 28 |
| Events of one ticket | 1.4 rounds x 28 + 1 decision + queue commands | about 41 |
| A 20-ticket refinement, 20 voters | 20 x 41 | about 830 events (0.23 a second over an hour; 0.012 a second per person) |
| Import of 100 tickets | 4 `note.addMany` batches of 30 | 4 events |
| Bytes in the relay buffer | 830 x about 704 | 0.58 MB of 4 MiB, 830 of 2,000 envelopes |
| Replay at load | about 1,200 events replay in well under a second (ADR-0042) | no snapshot is needed for the estimation alone |
| Billed requests for the estimation, mesh path | ((390 join messages) / 20) + 20 socket upgrades + 40 to 80 page requests, plus the relayed events / 20 in the worst case | 80 to 130 of 100,000 a day: the figure of ADR-0042, since the retro's own join cost is already paid |
| Board limits | `maxNotes` 300, `maxBatch` 30, `MAX_ROUNDS` 200, queue 100 | about 140 tickets at 1.4 rounds each |

A retro's own events (notes, votes, chat) come on top: a 20-person retro is up to 7,200 events an hour at the worst case of `docs/capacity.md`, so a board that runs both approaches the relay's 2,000-envelope buffer, which peers re-seed as for any long board. The estimation alone does not reach it. The poker rate cap per author (`foldRateMax` 60 per 10 seconds) is never near: a person sends one vote per round.

Storage. Nothing on our side. On a device the estimation state is part of the board's replica (about 0.6 MB for the refinement above, sealed with the rest) and its snapshot (the queue, flags, estimates and verdicts: a few kilobytes).

Bundle. The entry chunk is at its 56.5 kB limit. The new phase kind and the badge slot are a few bytes in shared code; the phase view, the starter, the queue and the exporters are lazy chunks loaded when a board enters the phase or opens the starter, counted in the total (419.8 kB of 500 kB measured on 2026-11-21, with `poker-deck-studio` and `poker-in-retroboard` planning 24 and 20 kB more). The ceiling for this change is 16 kB gzip on the total; task 1.1 measures the entry and asks for a budget line if the kind and the badge slot need one.

## Security and privacy note

A ticket, an estimate, a queue and a deck are content, encrypted with the board's room key (and passcode) like a note; the relay sees envelopes of five fields and learns neither that a board is estimating nor the kind. The cards are sealed to a key per round published at the reveal (ADR-0042 finding 2): no participant, even with a modified client, can read a card early; the device that opened the round holds its key and could read cards early with a modified client, as a facilitator can on a board, and the interface never shows them, and the help says so. The estimate is stored in the board, not in the note's text, so it is not lost to an edit. Per-voter cards are not exported unless asked. Imported Jira text is content: it never goes to us, is never logged, is never used as an instruction, and the Jira key link opens only an `https` site the person gave. No token, no network call to Jira, no third-party origin, no analytics. The unknown-tag rule means a person on an older version cannot be shown wrong data; they see the "newer version" notice.

## Risks and open points

- **The fold and the snapshot are shared code.** Adding a ledger field, a routing rule and a version bump touches what every board runs. The existing ledger, relay and board tests stay unchanged and gate it, and the new field is absent on a board that never estimates, so a board that does not use the phase folds byte for byte as before. If a snapshot cannot carry the state safely, the fallback is no snapshot for a board that has an estimation (replay all), which costs load time only.
- **A refusal that drops silently.** An `agenda.set` with the new kind would be dropped by an older client without notice; task 1.1 turns an unknown phase kind into an unknown event with a test. This is a fix of a gap that also exists today for any new phase kind.
- **Open facilitation.** The decision that estimation is not open to everyone on an "Everyone facilitates" board (S7) is a departure from ADR-0021's default for the retro's other tools. It is the safe reading of a reveal bound to a device key; if the owner wants it open, the poker room already has the "Everyone moderates" option with the same rule (whoever opens the round reveals it).
- **Notes as tickets.** A note holds text only, so the key lives in the text and an edit of the text can break it. The estimate does not live in the text and survives; a ticket whose key was edited away exports with an empty key.
- **A cluster is not an item.** Grouped tickets are skipped by default; estimating a cluster as one story is possible later and is not decided here.
- **One estimate phase per agenda.** A second pass re-enters it. If the owner wants two distinct estimation phases with separate queues, the state becomes a list.
- **Free-form boards.** A board with no agenda gets a one-phase agenda when it starts an estimation; its retro then has an agenda it did not have. The starter says so.
- Not decided here: converting T-shirt or time cards to numbers for Jira, velocity and capacity, writing the estimate into Jira, estimating from the standalone room into a board other than through `poker-in-retroboard` S7, sub-tickets from a split.
