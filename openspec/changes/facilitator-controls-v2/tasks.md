# Tasks

## 1. Voting state

- [x] 1.1 Pure `votingState(snapshot, role)` (open, closed, phase-closed, overridden) in packages/application; verify unit tests
- [x] 1.2 Privileged override allowed outside the Vote phase and cleared at the next phase change, in the domain and protocol; verify unit tests
- [x] 1.3 Segmented voting control with state text (fr/en); verify e2e two contexts and axe

## 2. Controls

- [ ] 2.1 Facilitation menu grouping voting, reveal all and publish all (phone to TV); verify e2e and axe
- [x] 2.2 "Go to closing" with confirmation; verify unit test of the agenda jump and e2e

## 3. Timer

- [ ] 3.1 Click-to-start clock with play/pause icon; pausing it pauses the phase clock; verify e2e
- [ ] 3.2 Board option to start the timer at creation (off by default); verify e2e
