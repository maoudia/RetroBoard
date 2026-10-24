# Tasks

## 1. Domain

- [ ] 1.1 Implement `VotePolicy`, votable refs and limits (per person, per item, notes/clusters); verify unit tests
- [ ] 1.2 Implement hidden counts read model and `VotingClosed`/`TallyRevealed`; verify unit tests
- [ ] 1.3 Implement sealed ballot (seal to facilitator key, facilitator tally, signed reveal); verify unit tests where participants cannot attribute votes

## 2. UI

- [ ] 2.1 Vote UI: toolbar remaining dots, my-vote dots on items, undo, bump animation, cluster vote button (fr/en); verify e2e
- [ ] 2.2 Facilitator close/reveal controls; verify e2e that counts appear simultaneously in two contexts
- [ ] 2.3 Ranking page with podium, ties, "create action" per item; verify e2e and visual regression
