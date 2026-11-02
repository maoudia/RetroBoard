# Proposal

## Why

Owner feedback (2026-10-29): a facilitator needs to freeze a note: it stays on the board, tagged as frozen, read only (no edit, vote, delete, move, group or colour change).

## What Changes

- Facilitator actions Freeze and Unfreeze on a note or a cluster (privileged, signed).
- Frozen notes show a badge and a frosted style from the theme tokens; disabled actions explain why.
- The fold refuses every change to a frozen note, so every peer agrees.
- Exports and the report carry the frozen flag.

Out of scope: archiving or hiding notes.

Bounded contexts: Ideation, Access (privileged command). One event per freeze; no budget impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`

## Impact

- Domain: note.freeze and note.unfreeze, guards in every note command; protocol; web badge and menu; exporters.
