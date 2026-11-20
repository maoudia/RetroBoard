# Proposal

## Why

Facilitators need to deal with people who joined by mistake or disrupt the retro, fix names ("Anonymous 3" is really Sam), and run a "reveal" moment where every private draft lands on the board at once.

## What Changes

- **Remove a participant**: hide them (exists) and end their session: their client receives a signed `participant.remove` and leaves the board. Because anyone with the link can come back, the facilitator is offered **"Move the team to a fresh link"**: a new room and key are created, the board is copied there (signed events re-published under the new room), and the new link is sent to every remaining participant through the encrypted channel; the removed person keeps an old link to an empty, closed room.
- **Rename a participant** (facilitator): set a display name for a participant (only on this board, shown with an "edited by the facilitator" hint); participants can still rename themselves.
- **Reveal all drafts** ("unveil"): the facilitator starts a 5-second countdown shown to everyone; at the end each participant's drafts are published, except drafts the participant marked "keep private" during the countdown. It reuses the auto-publish mechanism of the agenda.

Out of scope: banning by IP or device (no accounts, no server state).

Bounded contexts: Access (roles, removal, key rotation), Ideation (reveal). Relay traffic: one event per action; "fresh link" re-publishes the board once (bounded by the board size).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `facilitation`: remove, rename, reveal all.
- `room-access`: move to a fresh link (key rotation).

## Impact

- Domain: `participant.remove`, `participant.rename` (role events), `drafts.reveal` command.
- Web transport: room migration (new key ring, copy, handoff message), reveal countdown, "keep private" toggle on drafts.
