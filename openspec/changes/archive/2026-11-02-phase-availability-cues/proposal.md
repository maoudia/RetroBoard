# Proposal

## Why

Owner feedback (2026-10-25): when the current phase does not allow publishing notes, nothing says so before the note is refused. Voting already greys out its controls outside the vote phase; writing must do the same, visually and for assistive technologies.

## What Changes

- Outside a phase that allows writing (agenda running with rules), every composer turns into a closed state: greyed field and buttons, a lock icon and a one-line reason ("Writing is closed during Vote"), and when a later phase allows writing, when it opens ("Opens again at Group" or "Opens at the next Write").
- Drafts stay editable as private drafts (they are local) but cannot be published; the publish buttons are disabled with the same reason.
- The same visual language for every phase-gated control: votes, actions, grouping. One component, one style token (`--gated`), one i18n pattern.
- People who bypass the rules (facilitator capability) see the controls enabled with a small "allowed for you as facilitator" hint, so they know others are blocked.
- Screen readers: closed controls use `aria-disabled` with the reason in `aria-describedby`; a phase change announces what opened and what closed.

Out of scope: changing which commands each phase allows (retro-agenda rules stay).

Bounded contexts: Facilitation (read model only). No new relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`: closed composer outside writing phases.
- `retro-agenda`: consistent gated-control cue for every phase rule.

## Impact

- Application: `phaseAvailability(snapshot, role)` read model: for each gated action, allowed or not, the reason and the next phase that allows it.
- Web: `GatedHint` component and `--gated` token in every theme; composer, vote, action and group controls use it.
