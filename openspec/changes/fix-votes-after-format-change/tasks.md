# Tasks

## 1. Reproduce and fix

- [ ] 1.1 Reproduce with a failing domain test and a failing e2e (board with notes and a cluster, votes cast, format changed with the notes kept, then the card, the results and the vote button read) for the format change, a column edit that turns voting off and a move into a non-votable column; record the cause in the pull request; verify that each test fails on the current code
- [ ] 1.2 One predicate for "this idea is counted" in `packages/domain/src/voting/policy.ts`, used by `votability`, the per-person vote count and the snapshot (an idea in a non-votable column exposes no count), and by `buildRanking`; verify unit tests including the return of the votes when the column becomes votable again, secret and sealed voting, and `pnpm arch`
- [ ] 1.3 Web: no count and no vote control on a card or cluster whose column is not votable; the format-change confirmation states how many votes are set aside; fr and en keys; verify the e2e of 1.1 passes, the existing voting e2e specs pass unchanged, axe, and the pseudo-locale overflow check
