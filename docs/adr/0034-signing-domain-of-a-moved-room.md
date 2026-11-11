---
status: proposed
date: 2026-11-11
decision-makers: Moncef Aoudia
---

# Signing domain of a moved room

## Context and Problem Statement

"Move the team to a fresh link" (change `facilitator-moderation`, group 2) gives the board a new room id and a new room key, so a removed participant who still holds the old link cannot read what happens next. Event signatures are bound to the room id (`signedMessage(roomId, ...)`, domain separation, `packages/application/src/events/signed.ts`), so an event copied to the new room fails verification there. The question: how does the board keep its history, its authors ("only the author edits") and its votes in the new room?

## Decision Drivers

* A board is its signed event log: authors, votes and the role events (co-facilitators, hand-over) must survive the move.
* The replicated fold must stay deterministic and unchanged: every replica must reach the same state, old and new clients alike.
* No new cryptographic algorithm, no server state, nothing new for the relay to see.
* A signature must not become replayable between unrelated boards.

## Considered Options

* Carry the events and verify them against a `movedFrom` room id announced by a new genesis (design.md, open question 1)
* The facilitator re-signs a snapshot as fresh commands in the new room (open question 2)
* Keep the signing domain of the first room: the new link names it, the transport room changes

## Decision Outcome

Chosen option: "Keep the signing domain of the first room", because it changes neither the fold nor the verification rule, it keeps every author and vote, and it needs no genesis surgery.

* A key ring gets an optional `signRoomId`: the room id that event signatures are bound to. Absent, it is the room id (every board made so far). A moved room's ring has a new `roomId` (relay room, envelope header and AAD, replica key) and `signRoomId` = the signing domain of the room it left, so it stays the first room's id however many times the board moves.
* The link carries it in the long syntax as `&d=<signing room id>`: `#r=<room>&k=<key>&d=<domain>` (with `&f=` for the facilitator, `&p=1` for a passcode). The compact syntax cannot hold it and is not used for moved boards. Mixing `c` with `d` is refused. Older clients refuse the link (unknown field) rather than misread it.
* The transport builds its event log, signs and verifies with `signRoomId ?? roomId`. The genesis carried over names that same id, so the ledger of the new room is the ledger of the old one, event for event.
* The events are not touched: each client seals the events of its own log under the new room and the new content key (`rb/content/v1` over the new room key), and keeps them in the local copy of the new room. Nobody needs to upload the board for the move.
* Nobody in the new room can forge an event for another author, and a link crafted with a wrong `d` only gives its maker a room they already control: signatures still bind an event to the signing domain, so events of another board never verify here.

### Consequences

* Good, because history, authors, votes and roles survive a move unchanged, and a board can move any number of times.
* Good, because the fold, the protocol envelope and the relay are unchanged: only key-ring parsing, formatting and the transport's choice of domain change.
* Bad, because moved boards use the long link syntax (about 105 characters instead of 48).
* Bad, because the room id in a signature is no longer the room id of the relay room: a reader who sees both must remember which is which (`roomId` vs `signRoomId` in the code).
* Bad, because the first room's id lives for as long as the board does, in every link; it is not secret (it was in the old link) and reveals nothing the removed participant did not already know.

## More Information

Change: `openspec/changes/facilitator-moderation` (design.md, "Fresh link"). Related: ADR-0029 (link syntaxes), `packages/crypto/src/primitives.ts` (`sealTo`, `openFrom`). Revisit if the relay ever authenticates rooms, or if boards are expected to move often enough for the long link to matter.
