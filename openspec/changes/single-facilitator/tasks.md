# Tasks

## 1. Roles

- [x] 1.1 `role.claim` signed with the facilitator capability key, fold rule "last claim wins", previous lead becomes co-facilitator; verify unit tests (ordering ties, revoked claims)
- [x] 1.2 Takeover dialog when opening the facilitator link while someone else leads, and the "you are no longer the lead" notice (fr/en); verify e2e with two contexts
- [x] 1.3 Theme sync regression test (facilitator not the creator, new lead after handover); verify e2e (tests/e2e/theme-sync.spec.ts)

## 2. Visibility

- [ ] 2.1 Crown badge on the lead's pointer, presence markers and participants list; verify e2e and axe
- [ ] 2.2 Facilitator link card in the share panel with copy, warning and handover to a connected participant (fr/en); verify e2e
