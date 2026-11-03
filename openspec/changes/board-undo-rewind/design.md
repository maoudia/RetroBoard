# Design

## Decisions
- Append-only: an undo is a new event referencing the target event id; the reducer applies the inverse. This keeps replication and signatures intact.
- Scope of reversible commands is an explicit allow-list; votes and chat are not rewound.
- Conflicts: if a later event depends on the undone one, the undo is rejected with a message.
- Retention: the last 50 reversible actions in the read model; the ledger keeps everything as today.
- Alternative rejected: snapshots of full state (heavy for encrypted sync).
