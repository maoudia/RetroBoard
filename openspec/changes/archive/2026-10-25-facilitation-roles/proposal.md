# Proposal

## Why

Time-boxed phases, talk time, vote reveal and agent invitations need someone in charge. Today everyone can do everything, which is fine for small teams but chaotic for larger ones.

## What Changes

- Facilitator role held by the board creator (facilitator key from `e2e-encrypted-rooms`).
- Delegation: the facilitator can promote co-facilitators and hand over the facilitator role.
- Facilitator controls: phases, timer, talk time, vote close/reveal, lock, theme, settings, agent invitations, removing a disruptive participant from view (local hide, since E2E cannot evict a key holder; rotate to a new board if needed).
- A "facilitation open to everyone" setting for small teams (default off for boards over 8 people, on for smaller).

Out of scope: per-column permissions.

## Capabilities

### New Capabilities

- `facilitation`: roles, delegation and what each role may do.

### Modified Capabilities

None.

## Impact

- Context: Facilitation. Domain policies for privileged events; UI badges and controls.
- Free-plan budget: none.
