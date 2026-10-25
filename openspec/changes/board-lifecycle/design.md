# Design

## Decisions

- `board.destroy` is an ordinary signed privileged event. When a client folds it: it wipes its replica for the room, forgets the room in recents, closes the transport and shows the closed page. The fold ignores every later event, so a stale peer cannot resurrect the board by re-seeding.
- Peers that keep an old copy (offline during the destroy) learn it as soon as they sync with anyone holding the event; a board file exported before the destroy can still be restored into a new room only (its room is marked destroyed locally).
- `agenda.prev` restores the previous phase with `startedAt` such that its remaining time equals what it had when it was left (needs `actualMs`, recorded since retro-report).
- Resets are separate commands so the event log records what was reset.

Where things live: commands and fold rules in `packages/domain`; replica wipe in the web transport; UI in `apps/web`.

Security and privacy note: the relay sees one more envelope; destroying cannot remove copies a participant saved as files, and the UI says so.
