# Proposal

## Why

Owner feedback (phone, 2026-11-03): the "published, undo" toast is a flat pill that sits on top of the writing area and the board. Design red line: nothing may be displayed over the board content in a way that hides it. Toasts must float in a safe zone, stay readable at every screen size, and follow current notification practice.

## What Changes

- Toasts become floating cards in a safe zone: they never sit over the writing area or the board columns; on phones they dock under the header, on larger screens in the chosen corner or centre at the top.
- Readable at every size: wrapped text (no nowrap pill), max width of the viewport minus gutters, safe-area insets, tone icon and tone accent, 44 px action target, optional close button.
- Timing as practice requires (WCAG 2.2.1 and 4.1.3): a thin progress line shows the remaining time, hover or focus pauses it, reduced motion removes the slide; polite live region for info and ok, assertive for warnings.
- Stack of at most 3, newest nearest to the edge, never reflowing the board (fixed position, no layout shift).

- Voting bar rethought: one state chip (open, closed, waiting) replaces the split switch and the lone flag pill; "publish all" moves to the toolbar next to the writing toggle; voting can be turned off for a board at creation or in options, which hides the bar and the vote buttons.

Out of scope: the time-up popup (kept as is), system notifications.

Bounded contexts: UI only.

## Capabilities

### New Capabilities

- `notifications`

### Modified Capabilities

None.
