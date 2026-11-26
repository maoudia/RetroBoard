# Proposal

## Why

Owner note (2026-11-20): "CSS is still broken in group with menu." The "Group with..." entry of the post-it menu opens an inline list of ideas to tick and a "Group N" button (`NoteMenu.vue`, change `feedback-wave-6`); the owner reports that its layout is still broken after earlier fixes.

Reading the code, three things in that list are suspect and need a reproduction before any fix (task 1.1 records which one it is, with a screenshot):

1. The list is a `display: grid` box with `max-height: 11rem` and `overflow: auto` placed inside the dropdown panel, which is itself a grid (`.dd-panel:popover-open`, `grid-auto-rows: max-content`). The inner grid does not set `grid-auto-rows`, so its rows can stretch or squeeze once the height cap bites.
2. Every row is a `.dd-item`, whose shared style is a full pill (`border-radius: 999px`, `white-space` not constrained). A label that wraps over two or three lines becomes an oval, and `width: 100%` plus the list's `padding-left` pushes the row past the panel edge.
3. The "Group N" button is a `.btn` inside a menu, sized with `calc(100% - 1rem)`, and the panel's bottom fade mask (`data-more`) can cover it.

The fix is small, but the same menu has been "fixed" before without a test that looks at geometry, so the change also adds one.

## What Changes

- Reproduce at 360 px, 768 px and 2560 px, in a light and a dark theme, with one short idea, with 30 ideas and with very long unbroken text, and record what breaks.
- Fix the list layout in the component (rows keep their natural height, wrapped labels use a rounded rectangle not an oval, nothing exceeds the panel width, the button stays visible at the bottom of the list, the list scrolls inside the panel without double scrollbars), using the shared tokens only.
- Add a geometry guard: an e2e that opens the list in those conditions and asserts that every row and the button lie inside the panel box, no horizontal scroll, and the button is reachable by keyboard and not covered by the mask.

Out of scope: redesigning the grouping flow, the group menu of `group-colors-menu-and-scope`, drag and drop grouping.

Bounded contexts: Ideation (clusters), web only. No domain, protocol or relay change; no free-plan impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `grouping`: the layout of the "Group with..." list is guaranteed by a test.

## Impact

- `apps/web/app/components/NoteMenu.vue` (scoped styles of the list), possibly `assets/css/base.css` (the `.dd-item` wrapping rule, only if the pill rule is the cause), e2e spec for the geometry. Design tokens only (`apps/web/test/design-tokens.test.ts`).
