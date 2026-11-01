# Proposal

## Why

Owner feedback (2026-11-01): on small screens the toolbar buttons wrap onto several rows and eat the space of the columns, which is bad for the board. The tools should slide horizontally instead.

## What Changes

- Below 720 px the tools row stays on one line and scrolls horizontally (touch swipe, trackpad, keyboard focus scrolls the focused tool into view), with soft fades on both edges as the cue that more tools are off screen; no visible scrollbar.
- The toolbar keeps a fixed small height on phones: brand and clock on the first row, the sliding tools on the second, so the columns get the rest of the screen.
- Between 720 px and 1100 px the tools row also scrolls instead of wrapping when it does not fit.
- Popover menus are unaffected (top layer); reduced motion disables smooth scrolling.

Out of scope: moving tools into a hamburger menu, reordering tools.

Bounded contexts: UI only.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Web: `AppToolbar.vue` layout; e2e on phone viewport (toolbar height, horizontal scroll, focus visibility).
