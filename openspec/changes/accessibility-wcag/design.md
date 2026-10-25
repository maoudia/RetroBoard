# Design

## Decisions

### D1. One announcer

A single `useAnnouncer()` composable owns two live regions (polite, assertive) mounted once in the layout. Callers send messages with a key; repeated messages within 2 s are merged ("3 new notes in Start") so a busy board does not flood screen readers. Assertive is reserved for the end of a timer and errors.

### D2. Drag alternatives through the existing menus

Note and group menus already offer "Move to column". Add "Group with...", "Move up" and "Move down" so every drag result can be reached with a menu and the keyboard (WCAG 2.5.7). Drag stays the fast path for pointers.

### D3. Contrast as a unit test, not only axe

axe only sees what is rendered. A test in packages/themes computes contrast for every pair of tokens used together (text on note colours, text on surfaces, focus ring on surfaces) for every theme and variant, and fails below 4.5:1 (text) or 3:1 (UI parts, large text).

### D4. Focus not obscured

The toolbar and floating popups reserve space with `scroll-padding-top` and `scroll-padding-bottom` equal to their height (CSS variables), so a focused element scrolled into view is never under them.

## Risks

- Themes with strong artistic palettes may need darker text tokens; the test makes it visible early.
