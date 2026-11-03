# Tasks

## 1. Decision

- [x] 1.1 Inventory of the solo versus shared differences and ADR "one engine for solo and shared boards"; verify `pnpm adr:check`

## 2. Engine

- [x] 2.1 In-memory relay port for the ledger transport; solo boards use it; verify unit tests and e2e solo flows (notes, agenda, clusters, votes, actions)
- [x] 2.2 "Try solo" goes through the creation flow with solo preselected; verify e2e from landing and creation
- [x] 2.3 Remove `LoopbackTransport` and the legacy reducer usage (code, tests, docs); verify `pnpm verify` and `pnpm arch`

## 3. Guards

- [x] 3.1 Parity e2e test listing board features for solo and shared boards; verify it fails on a deliberately removed feature
- [x] 3.2 Duplication gate (jscpd) in verify and refactor of current duplicates; verify the gate passes with the agreed threshold
