# Tasks

## 1. Domain

- [ ] 1.1 `openFacilitation` defaults to true in `board.create` with a setup flag for "One facilitator"; existing boards replay unchanged; verify unit tests (fold of an old event log)
- [ ] 1.2 Split `canRunPrivileged` and `bypassesPhaseRules` in the ledger; phase rules apply to participants on open boards; verify unit tests and mutation score of packages/domain
- [ ] 1.3 `settings.update.openFacilitation` accepted only from the facilitator capability key; verify unit tests with a modified client

## 2. Web

- [ ] 2.1 Setup form choice "Everyone facilitates" / "One facilitator" with short explanations (fr/en); verify e2e (default and explicit)
- [ ] 2.2 Options toggle for capability holders, facilitation bar for everyone, no crown or lead wording on open boards, facilitator link under "Advanced" in the share panel (fr/en); verify e2e with two contexts and axe
