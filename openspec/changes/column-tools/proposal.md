# Proposal

## Why

Owner feedback (2026-10-29): columns only sort by votes; the owner wants more sorting options, an option to group notes by author automatically, and a small column menu to resize a column (predefined sizes, mouse or keyboard), with the same for the writing area, so every screen size works.

## What Changes

- Sorting (personal view): votes, newest, oldest, author, colour, cluster size, A to Z.
- Automatic grouping (facilitator, undoable, with a preview): group by author (anonymous notes stay loose) and group similar ideas (reuses the similar-idea hint).
- Column menu: narrow, normal, wide, full width; drag the edge or use Alt+arrow keys; same for the writing area height; personal and remembered per board.

Out of scope: density levels and zoom (postit-visual-system 1.3), presenter focus (presenter-mode-v2).

Bounded contexts: Ideation (grouping commands), presentation for sorting and sizes. Grouping uses existing commands; no new relay traffic beyond them.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `columns`
- `grouping`

## Impact

- Application: sort read model and grouping plans; web: column menu, resize handles; local view state.
