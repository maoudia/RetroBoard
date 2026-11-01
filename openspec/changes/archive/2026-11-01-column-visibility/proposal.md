# Proposal

## Why

Owner feedback (2026-11-01): a facilitator wants to hide a column for a while to make the board less noisy (for example the "Kudos" column during the discussion), then show it again, from the column menu.

## What Changes

- Facilitator actions Hide and Show in each column menu (privileged, signed): the column disappears for everyone, its notes, votes and actions are kept.
- A discreet chip in the board header lists the hidden columns; facilitators show a column again from it, participants only see that columns are hidden.
- Hidden columns are skipped by presenter focus and arrow navigation; exports and the report still include them, marked hidden.
- Hiding is temporary by nature: a "Show all columns" entry and every column comes back when the agenda reaches the closing phase.

Out of scope: per-participant hiding (a personal filter), deleting columns (exists).

Bounded contexts: Ideation (column state), Access (privileged command). One event per hide or show; no budget impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `columns`

## Impact

- Domain: `column.hide` and `column.show` (privileged) and a `hidden` flag on the column; protocol; web column menu, header chip, presenter and exports.
