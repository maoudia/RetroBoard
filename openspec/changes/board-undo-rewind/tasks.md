# Tasks

## 1. Domain
- [x] 1.1 Inverse of group, ungroup, move, edit and colour as compensating commands computed from the state before the action (application layer, no new event type); verify unit tests in packages/application/test/history.test.ts
- [ ] 1.2 Delete and rename inverses (needs a restore event in the domain) with deterministic fold; verify unit tests including conflicts and invalid targets ignored

## 2. Application and read model
- [x] 2.1 Bounded undo stack (30) and `undo()` in the board commands; verify unit tests
- [ ] 2.2 Redo, rewind and a history read model (last 50); verify unit tests with testkit

## 3. UI
- [x] 3.1 Ctrl+Z with a toast (fr and en); verify e2e (wrong grouping undone, tests/e2e/undo.spec.ts)
- [ ] 3.2 Ctrl+Shift+Z, history panel with restore, two-peer e2e and axe
