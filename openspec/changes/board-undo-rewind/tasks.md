# Tasks

## 1. Domain
- [x] 1.1 Inverse of group, ungroup, move, edit and colour as compensating commands computed from the state before the action (application layer, no new event type); verify unit tests in packages/application/test/history.test.ts
- [x] 1.2a Delete inverse for an idea without votes or cluster (re-added as a new idea, no domain change); verify unit tests
- [ ] 1.2b Rename inverse and restore of voted ideas (needs a restore event in the domain)

## 2. Application and read model
- [x] 2.1 Bounded undo stack (30) and `undo()` in the board commands; verify unit tests
- [x] 2.2a Redo stack (undo again after redo); verify unit tests
- [x] 2.2b Rewind and a history read model (last 50); verify unit tests with testkit

## 3. UI
- [x] 3.1 Ctrl+Z with a toast (fr and en); verify e2e (wrong grouping undone, tests/e2e/undo.spec.ts)
- [x] 3.2a Ctrl+Shift+Z / Ctrl+Y and toolbar undo/redo buttons for phones; verify e2e
- [x] 3.2b History panel with restore, two-peer e2e and axe
