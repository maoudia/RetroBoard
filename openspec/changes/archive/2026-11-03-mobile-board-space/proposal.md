# Proposal

## Why

Live retro feedback (owner, 2026-11-02, phone screenshot): on a phone the title, ring, toolbar, phase bar and voting bar take more than a third of the screen before the first post-it; there is no room left to work.

## What Changes

- The board chrome collapses on phones: scrolling the columns down hides the toolbar, the phase bar and the voting bar behind one slim top bar (title, ring, menu); scrolling up or tapping the bar brings them back (like a mobile browser address bar).
- A compact phone toolbar: the five most used actions as icons in one row, the rest in a "more" sheet; no labels under 600 px.
- Columns snap one per screen horizontally with a column dot indicator; a vertical swipe stays inside the column.
- The voting bar becomes a small pill above the composer on phones (votes left, publish), not a full-width row.
- Reduced motion: the chrome hides without animation.

Out of scope: New layouts other than columns (see `board-layout-v2`).

Bounded contexts: none (presentation).

## Capabilities

### New Capabilities

- `mobile-board`

### Modified Capabilities

None.

## Impact

- Web: board page and its components; e2e on phone, desktop and TV.
