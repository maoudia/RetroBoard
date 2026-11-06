# Design

## Decisions
- Append-only: an undo is a new event referencing the target event id; the reducer applies the inverse. This keeps replication and signatures intact.
- Scope of reversible commands is an explicit allow-list; votes and chat are not rewound.
- Conflicts: if a later event depends on the undone one, the undo is rejected with a message.
- Retention: the last 50 reversible actions in the read model; the ledger keeps everything as today.
- A delete stays a real delete: votes and cluster membership are gone for good. Undo and rewind bring the idea back as a new one (text, colour, column), not the exact reducer state. Rejected: a restore event carrying owner and voters (forgeable) and a soft-delete marker (every reader of notes must filter it, and deleted text would stay in memory and in the board file).
- Alternative rejected: snapshots of full state (heavy for encrypted sync).
