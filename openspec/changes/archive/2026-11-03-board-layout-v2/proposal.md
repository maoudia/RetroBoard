# Proposal

## Why

Live retro feedback (owner, 2026-11-02): the writing area cannot be hidden when it is not needed, its size and the column widths can only be picked from presets, the column size icon looks like a checkbox, and the display of post-its should adapt from a phone to a TV while everybody sees the same layout.

## What Changes

- Hide the writing area: one visible toggle per board (toolbar and keyboard `W`) collapses every private section to a thin "Write" handle; remembered per screen class.
- Drag to resize: a grip on the right edge of a column (mouse, touch, keyboard Alt+arrows) sets its width; the writing area has a grip at its bottom edge. Presets (narrow, normal, wide, full) stay and reset the width; widths are personal and per screen class.
- Column size icon: a "columns width" icon (arrows apart) replaces the square that looked like a checkbox.
- Board display chosen per board by the facilitator and shared with everybody: post-it size (S, M, L), notes per row (auto, 1, 2, 3) and text size; TV screens scale it up automatically. Participants see the same layout so nobody is lost.

Out of scope: Other layouts than columns (grid, swimlanes): only if a later need appears.

Bounded contexts: Facilitation (board display settings event), presentation.

## Capabilities

### New Capabilities

- `board-layout`

### Modified Capabilities

None.

## Impact

- Web: board page and its components; e2e on phone, desktop and TV.
