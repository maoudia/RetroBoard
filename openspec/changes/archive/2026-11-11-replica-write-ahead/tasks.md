# Tasks

## 1. Write-ahead journal

- [x] 1.1 `ReplicaStorePort.stage?`, `withJournal` (localStorage, drained at start, merged by `load`), `stage` on the session store and the fallback, composition root; verify `replica-journal.test.ts` (staged before commit, drained by the next start, failing store, delete, throwing storage, session fallback)
- [x] 1.2 `publishLocal` seals and stages before the board shows the event; verify the e2e that leaves the page the instant an action is shown (it fails on main) and the solo carry-over e2e
