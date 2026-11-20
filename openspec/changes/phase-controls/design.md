# Design

## Where the types live

| Piece | Layer | Notes |
|---|---|---|
| `PhasePolicy`, `PHASE_PRESETS`, `phaseAllows(phase, command)` | `packages/domain/src/facilitation/agenda.ts` | Pure. The existing `PHASE_COMMANDS` table becomes the data behind `PHASE_PRESETS`. |
| Command `agenda.policy` (phase id, partial policy) | `packages/domain/src/shared/commands.ts`, `facilitation/handlers.ts` | Facilitators only (the same right as `agenda.update`). |
| `phaseAvailability` and `votingState` | `packages/application/src/read-models/` | Read the policy; the answer shape (`Availability`) does not change, so the cues keep working. |
| Board options "Phases", agenda editor switches, lock button | `apps/web` | Advanced mode only for the switches. The lock is shown to facilitators in both modes. |

## The policy

Six capabilities, each a boolean. Each maps to the commands it governs:

| Capability | Commands |
|---|---|
| `write` | create, edit and delete own ideas and drafts |
| `publish` | publish drafts (off: drafts stay private to their author, nothing reaches the board) |
| `group` | group, ungroup, merge, move, recolour |
| `vote` | cast and withdraw votes |
| `actions` | add, edit, assign and tick actions |
| `freeze` | when on, participants can do none of the above; facilitators still can |

Chat, the talk turn and the presenter are never governed (as today, `allowedInPhase` lets them through).

The presets are exactly today's table, so `Phase.policy` absent behaves as before. A stored policy holds only the capabilities that differ from the preset, which keeps events small and makes "Reset to recommended" a delete.

"Nothing published" is read as the `publish` capability: during a phase where it is off, drafts are written but not shown to others, which is the brainwriting pattern. The owner should confirm that reading in the pull request of group 2 (if it meant hiding already published ideas, that is the existing masked-column behaviour and needs no new capability).

## The lock on a post-it

`voteOpen` stays the storage of the override (it is cleared at the next phase change, `withoutOverride`), so existing boards and clients are unaffected. The lock button calls the same command as before; the advanced "vote" switch for the current phase is the persistent version of it. The two cannot disagree because both are read through `phaseAllows`.

## Compatibility between clients

The fold must give every replica the same result. `agenda.policy` is a new command, and since `deploy-safe-sessions` (archived) a client that meets an event body it does not know keeps it, forwards it and shows "A participant uses a newer version: reload". The risk is the window before that reload: the older client does not fold the policy, applies the preset and accepts a command the newer clients reject, so the replicas differ until it reloads. Group 1 must settle this before anything else, with one of:

1. accept the window, as for every new command, and prove with a test that the older client converges after the reload and never loses a rejected command (the fold rejects it on the newer clients, so nothing is stored that the older client would apply differently later); or
2. carry the policy in the genesis of the agenda only (decided at creation), and refuse `agenda.policy` after the agenda has started, which removes the window for running boards.

Option 1 is preferred if the test passes. If the fold's treatment of unknown state changes, an ADR is added (`pnpm adr:new`), and the older ADRs are not rewritten.

## Security and privacy note

The policy is part of the encrypted board events; the relay sees only the opaque ciphertext and its size and timing, as for any other event. No board content is added to a policy. A facilitator who turns `publish` off makes drafts stay local, which reduces what is shared, never increases it.

## Risks

- Too many switches overwhelm: advanced mode only, grouped by phase, with a plain-language summary and a one-click reset.
- A custom policy that traps a retro (for example `vote` off in every phase): the summary warns, and the facilitator can always use the lock or "Reset to recommended".
