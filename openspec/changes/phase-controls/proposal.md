# Proposal

## Why

Owner notes (2026-11-20), two that belong together:

- "In advanced-mode board settings each phase gets on/off controls (able to write, able to vote, freeze, nothing published, etc), full control, with best practice enabled by default in simple mode."
- "On post-its replace 'open voting now' with a facilitator action using a lock icon, no text."

Today the phase rules are one switch and one fixed table. `agenda.rules` turns all rules on or off for the whole retro, and what each phase allows is the constant `PHASE_COMMANDS` in `packages/domain/src/facilitation/agenda.ts` (Write allows notes, Group allows moving and clustering, Vote allows voting, and so on). A facilitator who wants to let people keep writing during Group, vote while still grouping, freeze the board during Rank, or keep drafts private for one more phase has two choices: turn every rule off, or use the one override that exists (`voteOpen`, "open voting now", which shows as a text button on every post-it, `VoteControl.vue`). The text button is noisy on a board full of ideas and is the only per-capability control there is.

## What Changes

- **A capability policy per phase.** Each phase of the agenda carries a small policy of on/off capabilities: write ideas, publish ideas (off keeps every draft private, "nothing published"), group and move, vote, edit actions, and freeze (the board is read-only for participants during this phase). The default of each phase is today's behaviour, so nothing changes for a board whose facilitator never opens the settings.
- **Best practice by default in simple mode.** Simple mode shows no switches; it applies the preset of each phase (the current table, documented as the "recommended" preset, with the agenda's auto-publish at the end of Write). The facilitator can only choose "rules on" or "rules off", exactly as today.
- **Full control in advanced mode.** The board settings gain a "Phases" section: one row per phase of the agenda, one switch per capability, a "Reset to recommended" button per phase and for the whole board, and a summary line that says in words what participants can do in the current phase. The creation agenda editor offers the same switches so a board can start with a custom plan, and a team can save it with its agenda.
- **The lock on the post-it.** The text button "Open voting now" on post-its is replaced, for facilitators only, by an icon-only lock button (lock icon, accessible name and tooltip "Open voting now" or "Close voting", 44 px target on touch, no visible text). It is a shortcut to the same switch: turning the "vote" capability on or off for the running phase. Participants see no button, only the existing cue that voting is closed by the phase.
- **Same answer everywhere.** The vote bar, the composer, the group controls and the action controls read one function (`phaseAllows` on a phase and its policy), and the relay-free fold rejects a command that the policy forbids exactly as it does today, so every replica agrees.

Out of scope: per-participant rights (that is `facilitator-moderation` and the roles), changing the preset of a phase, new phases, a schedule of switches inside one phase, changing the timer or auto-chain behaviour.

Bounded contexts: Facilitation (domain: agenda and phase policy), Voting (override), the web controls. No relay traffic beyond one small event per change (about the size of an agenda update, rare and facilitator-driven): the free-plan budget is unaffected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `retro-agenda`: per-phase capability policy and its presets.
- `ui-modes`: simple applies the presets, advanced exposes the switches.
- `voting`: the post-it lock replaces the text button.

## Impact

- Domain: `Phase.policy?` (optional, absent means the preset), `phaseAllows(phase, command)` replacing the kind-only lookup, a command `agenda.policy` (facilitators), snapshot and clone/team-share mapping; see `design.md` for the compatibility rule between clients.
- Application: `phase-availability.ts` and `voting-state.ts` read the policy; the activity feed lists policy changes.
- Web: board options "Phases" section, `AgendaEditor.vue`, `VoteControl.vue`, composer and group and action gates, i18n fr and en, guide chapter and manifest.
- Tests: unit tests of every phase kind against its preset (proving no behaviour change), property test that the fold and the UI gate agree, e2e of a custom plan, simple mode, the lock.
