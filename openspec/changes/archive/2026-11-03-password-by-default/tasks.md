# Tasks

## 1. Generator

- [x] 1.1 Pure generator with injected randomness: readable (Apple style), random (length, classes, look-alikes, every class required) and passphrase (fr/en word lists, separator, capitalisation), plus an entropy estimate; verify unit tests on classes, exclusions, length bounds, entropy values and a uniformity check

## 2. Creation

- [x] 2.1 Passcode block right under the title in simple and advanced modes: default generated value, regenerate, reveal, copy, own value (fr/en); verify e2e and axe in light and dark
- [x] 2.2 Advanced generator panel and strength meter; verify e2e for each mode
- [x] 2.3 "No passcode" confirmation with risks; verify e2e that cancel keeps the passcode and confirm creates an open board

## 3. Joining and sharing

- [x] 3.1 Remember the passcode on the device with the local copy (same retention, forgotten with the board); verify e2e two contexts and that nothing is stored in plain text
- [x] 3.2 Invite panel keeps link and passcode as two separate copies with the two-channel advice (a combined copy was dropped on purpose: it would put both in one message); verify e2e
- [x] 3.3 Docs: security page, PLAN 5.1 and the room-access spec; verify `pnpm verify`
