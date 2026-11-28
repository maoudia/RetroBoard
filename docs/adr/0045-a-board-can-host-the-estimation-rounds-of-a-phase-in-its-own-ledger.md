---
status: proposed
date: 2026-11-21
decision-makers: Moncef Aoudia
---

# A board can host the estimation rounds of a phase in its own ledger

## Context and Problem Statement

ADR-0042 made a poker room a second room kind: the board model (columns, notes, clusters, actions) was wrong for estimation, so estimation got its own pure bounded context and its own rooms, and a board folds no poker event. The owner now prefers the estimation of a retro's tickets to be a phase of the board itself: Jira tickets are on a board as notes, the facilitator launches a voting poker phase on that same board, with the same link, passcode, encryption and people, and the agreed estimate is a badge on the ticket's note, kept in the board. The question is where the state of those rounds lives: in the board's own ledger, or in a poker room linked to the board. See the change `board-estimation-phase`.

## Decision Drivers

* The same link, key, passcode and presence: people must not hop to another room, and no second room key may be handed out
* Zero infrastructure cost and no server-side storage; end-to-end encryption with the key in the link fragment (ADR-0004); the relay stays kind-agnostic (ADR-0042)
* Votes hidden from every participant, even a modified client, until the reveal, with a key per round (ADR-0042 finding 2)
* The estimate must live with the ticket, survive note edits and reach the board's exports and report
* Boards must keep folding exactly as before (the board and ledger tests stay unchanged), and older clients must degrade, not break
* One implementation of rounds, sealing, reveal and statistics: the poker one

## Considered Options

* the board ledger hosts an estimation state of its own, folded by the poker reducer, only during an estimation phase
* a phase starts a linked poker room (its own link, key and ledger) and writes the result back to the board
* the estimate is only a text edit of the note, with no sealed rounds

## Decision Outcome

Chosen option: "the board ledger hosts an estimation state of its own, folded by the poker reducer, only during an estimation phase", because it is the only option that keeps the same link, key, passcode and presence, keeps the estimate in the board with the ticket, and still uses one implementation of the sealed rounds.

Rules:

* **A new field, not a new kind.** The ledger gains `estimation` next to `board` and `poker`. A board's genesis does not change and its `kind` stays absent. A poker room's rules do not change: it still folds only poker bodies plus the shared room tools of `poker-in-retroboard`.
* **The poker reducer is reused unchanged for the rounds** (`round.start`, `vote.seal`, `round.reveal`, `estimate.decide`, the deck, the cap of 20 voters). The estimation state wraps a `PokerState` and adds the queue, the current item, the estimates by item, the parked and split flags and the item of each round (a map in the estimation state, so `PokerState`, `Round` and the poker wire are untouched). Every estimation command, the poker ones and the queue ones, travels in one new body tag, `estimation`, so a poker room's wire does not change at all.
* **Poker bodies are accepted in a board only while the running phase is an estimation phase**, and only the lead and the co-facilitators may send the privileged ones: the open-facilitation switch of ADR-0021 does not extend to estimation, because a reveal is bound to the device that opened the round. A poker body at any other time, or in a board with no such phase, is ignored by every replica, as today.
* **The phase is a phase of the board's agenda** (a new `estimate` kind of the existing phase machine), so the stepper, the clock, the chain and the policy of `phase-controls` apply. It is created with a command of its own, so an older client keeps and forwards it as unknown and shows the "newer version" notice, which is the existing mechanism.
* **Snapshots.** `LEDGER_VERSION` becomes 2 (ADR-0037: a joiner trusts a snapshot only if it was made with its own rules). A snapshot carries the queue, the estimates, the flags and the revealed rounds' verdicts, never an open round's ballots, and is not cut while a round is open.
* **The estimate is state, not text.** It is stored by the item's id in the estimation state, drawn as a badge on the note, and is not written into the note's text, so editing the note keeps it.

### Consequences

* Good, because the phase is one more phase of the retro: same link, passcode, presence, chat, timer, theme and export, with no second room to hand out or to secure
* Good, because the rounds, the sealing, the reveal and the statistics are the poker code, tested once
* Good, because the board's other events fold exactly as before, so the existing tests gate the change
* Bad, because the shared ledger fold and the snapshot shape are touched, which needs a version bump and costs the snapshot shortcut between clients of different versions during a rollout
* Bad, because a board's ledger now carries ballots (about 0.8 MB for a 20-voter hour), which counts against the relay buffer of 2,000 envelopes or 4 MiB; peers re-seed beyond it, as for any long board
* Bad, because ADR-0042's rule "a room folds the content of its own kind and nothing else" gains an exception (the estimation phase), which a reader of that ADR must now also know

## More Information

Amends ADR-0042 in part without reversing it: the poker room kind, its genesis `kind`, its privilege set and its cap stand; what is added is that a board may also fold poker bodies during an estimation phase. ADR-0042 carries a pointer here. Related: ADR-0004, ADR-0005 and ADR-0021 (roles and open facilitation), ADR-0037 (snapshots), ADR-0044. Spec and tasks: `openspec/changes/board-estimation-phase/`. Revisit if the relay buffer proves too small for a retro that also estimates, or if the snapshot version bump hurts a rollout.
