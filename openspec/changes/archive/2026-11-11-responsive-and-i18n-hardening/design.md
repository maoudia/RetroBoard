# Design

## Context

Layout uses fixed column widths and a dense toolbar; i18n labels in English are shorter than French ones.

## Decisions

- Breakpoints in one place (`packages/themes/src/screens.ts`; `packages/ui` does not exist yet), written on `<html>` as `--bp-*` custom properties next to `data-screen`; CSS cannot read them in a media query, so rules select on `[data-screen]` or repeat the pixel value; container queries on columns and the toolbar.
- Fluid type: `clamp()` scale with a TV multiplier driven by a `data-screen="tv"` attribute (auto from width, manual in presenter mode).
- Phone: the board is the column pager (scroll-snap, one column per screen) and a tab bar at the foot of the screen (icon over a short name, 56 px high) replaces the dots at the top; menus are bottom sheets. The sheet is the existing `Dropdown` (a Popover API panel in the top layer) pinned to the bottom edge when `data-screen="phone"`, not a `<dialog>`: one menu component keeps the focus, Escape and placement behaviour of the desktop menus and every menu gets the sheet at once. Drag is replaced by the existing "Group with..." menu action; long-press + drop targets are group 3.
- Toolbar fit: the toolbar measures its tools with their labels on and, when they do not fit (own row up to 1100 px, next to the brand and the clock above), sets `data-compact`: buttons turn icon-only, labels stay visually hidden (accessible name) and become the tooltip. It measures again when the width, the language or the buttons change.
- Thumb zone: under 480 px the primary action of a page is full width and at least 48 px high: the landing "Start a retro" button is fixed at the bottom of the screen; the "Create board" / "Open the board" button of the setup form sticks to the bottom while the form scrolls; the composer's add and publish buttons are 48 px.
- Overflow detection test: Playwright script walks visible elements and compares `scrollWidth`/`clientWidth` with a tolerance.
- Pseudo-locale generated from `fr` at run time by a pure function (`packages/i18n/src/pseudo.ts`: accents, +40% by stretching vowels, `[` `]` markers, `{placeholders}` untouched), switched on only by `?lang=pseudo` for that page load. A preview deployment is the same bundle as production, so the parameter cannot be tied to the host: it is never stored, never part of `LOCALES` or the settings, so nobody can select it. A key missing from the dictionaries is returned bare, without markers, so it stays visible. Content translated from other sources (template columns, theme texts) keeps the real language.

- Touch drag: native HTML5 drag and drop does not start from a finger on every browser, so a press of 350 ms without moving more than 8 px lifts a note or a cluster (`useTouchDrag`); a picture of it follows the finger and the elements marked `data-drop` (note, cluster, column) receive the same `dragover`, `dragleave` and `drop` events a mouse drag sends, so grouping, merging and moving keep one implementation. The browser's own drag, text selection and context menu are held off while a finger is down on the card; a click that ends a drag is swallowed.
- TV text floor: `data-screen="tv"` keeps the note text at 24 px or more (`clamp(1.5rem, 1em, 4rem)`), because the facilitator's small text size multiplied by the wall scale gave about 20 px.
- Wide and TV regression test: geometry, not pixels (columns side by side, no sideways scroll, text size). The repository has no screenshot baseline workflow and a baseline taken on a laptop would not match the Linux runners.

## Risks / Trade-offs

- [Drag and drop on touch is unreliable] -> explicit "Group with..." action in the note menu as an alternative.
- [Visual baselines multiply] -> limit to key screens.
