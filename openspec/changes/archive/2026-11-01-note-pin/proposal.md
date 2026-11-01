# Proposal

## Why

Owner feedback (2026-11-01): the freeze feature is well built; the same quality is wanted for pinning an idea at the top of its column, so the facilitator can keep the topic under discussion in view.

## What Changes

- Facilitator actions Pin and Unpin on a note or a cluster (privileged, signed), in the note menu and the cluster panel.
- Pinned items come first in their column whatever the sort (personal sorts apply below them), in pin order; a pin badge and a theme-token accent mark them.
- Pinning does not lock: a pinned note can still be edited, voted and grouped (freeze does that); a pinned and frozen note shows both badges.
- Exports and the report carry the pinned flag; presenter focus starts with pinned items.

Out of scope: pinning across columns, personal pins.

Bounded contexts: Ideation, Access (privileged command). One event per pin; no budget impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`

## Impact

- Domain: `note.pin` and `note.unpin` with a pin order; application: column items read model puts pinned items first; protocol; web badge, menus; exporters.
