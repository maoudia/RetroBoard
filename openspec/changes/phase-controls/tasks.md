# Tasks

## 1. Policy model

- [ ] 1.1 `PhasePolicy`, `PHASE_PRESETS` (today's `PHASE_COMMANDS` as data) and `phaseAllows(phase, command)` in `packages/domain/src/facilitation/agenda.ts`, `allowedInPhase` and `phaseAvailability` reading them, and the compatibility rule between clients decided as in `design.md` (an ADR if the fold changes meaning); verify unit tests that every phase kind with no policy gives exactly the old answers for every command (a table test against the old constant), `pnpm arch`, and the protocol compatibility test
- [ ] 1.2 Command `agenda.policy` (facilitators, partial policy, a preset-equal value is stored as no value), snapshot, activity entry, clone and team-share mapping (`clone.ts`, `team/share.ts`); verify unit tests of the handler, replay equality across two replicas, and that a participant is refused

## 2. Simple mode and the lock

- [ ] 2.1 Simple mode applies the presets and keeps only the "rules on or off" choice; the recommended preset is documented in the options text; verify an e2e of a simple board through every phase that matches today's behaviour
- [ ] 2.2 Post-it lock: `VoteControl.vue` replaces the "Open voting now" text button with an icon-only lock for facilitators (accessible name and tooltip, 44 px target on touch, open and closed states, nothing for participants), calling the same command; fr and en keys; verify e2e (facilitator opens and closes voting from a post-it, participant sees no button), axe, and that `data-testid` hooks used by existing specs are kept or migrated in the same pull request

## 3. Advanced control

- [ ] 3.1 Board options "Phases" section in advanced mode: one row per phase, one switch per capability, "Reset to recommended" per phase and for the board, a plain-language summary of the running phase, a warning when a custom plan leaves a capability off in every phase; verify e2e (turn write on during Group, freeze during Rank, reset), axe, phone to TV layouts and the pseudo-locale overflow check
- [ ] 3.2 The same switches in the creation agenda editor (`AgendaEditor.vue`), saved with a team's agenda; verify e2e of creating a board with a custom plan and of a team reusing it

## 4. Guide

- [ ] 4.1 Guide chapter "Phases and rules" (fr and en), manifest updated, `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`
