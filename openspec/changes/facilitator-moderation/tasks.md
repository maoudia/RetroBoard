# Tasks

## 1. Domain and crypto

- [x] 1.1 `participant.remove` and `participant.rename` role events with fold rules (facilitator only, not on facilitators); verify unit tests
- [x] 1.2 `drafts.reveal` command with countdown time; verify unit tests

## 2. Fresh link

- [ ] 2.1 Room migration: new key ring, re-seal envelopes, per-participant sealed `room.moved` handoff, removed participants excluded; verify unit tests and e2e with three contexts
- [ ] 2.2 Removal UI with the "Move the team to a fresh link" option and the closed-room page (fr/en); verify e2e

## 3. Rename and reveal

- [ ] 3.1 Rename from the participants menu with the facilitator hint (fr/en); verify e2e
- [ ] 3.2 Reveal-all countdown for everyone, "keep private" toggle on drafts, publication at the deadline; verify e2e with two contexts and a mocked clock
