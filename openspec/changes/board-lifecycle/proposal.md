# Proposal

## Why

Facilitators need to close a retro properly and to recover from mistakes: destroy the board after export, reset everything or one column, step back to the previous phase, and reset counters (timer, votes). Today only a full reset exists.

## What Changes

- **Destroy the board** (facilitator): after export (the export panel proposes it) or from Options. A signed `board.destroy` event makes every connected participant delete their local encrypted copy and leave; the link then shows "this board was closed by its facilitator"; participants offline at that moment delete their copy when they come back and see the event. The facilitator is asked to confirm by typing the board title.
- **Reset** (facilitator): full reset (exists, now with a confirmation listing what is lost), reset one column (notes and clusters of that column), reset votes, reset the timer and the agenda clock.
- **Previous phase** (facilitator): go back to the previous agenda phase, its clock restarting with the time it had left.
- All destructive actions are announced to everyone with a toast ("Alice reset the votes").

Out of scope: undo of a destroy (impossible by design: there is no server copy).

Bounded contexts: Facilitation, Ideation, Voting. Relay traffic: one event per action.

## Capabilities

### New Capabilities

- `board-lifecycle`: destroy and resets.

### Modified Capabilities

- `retro-agenda`: previous phase.

## Impact

- Domain: commands `board.destroy`, `column.reset`, `vote.reset`, `agenda.prev` (privileged), fold rule: after `board.destroy` every later event is ignored.
- Web: replica deletion on destroy, closed-board page, confirmations, export panel suggestion.
