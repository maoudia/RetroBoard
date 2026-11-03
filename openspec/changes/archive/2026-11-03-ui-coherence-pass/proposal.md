# Proposal

## Why

Owner feedback (2026-11-02): many text buttons are not centred in width and height, button radii differ across the app (the owner wants the semi-circle pill everywhere and the old styles removed), the activity ring and its start and stop button are not centred in their container, the advanced creation form stretches its two-option container across the whole width, menus (invite, export, voting, toolbar) are not ordered by importance, and the voting bar eats the column space on small screens instead of scrolling sideways like the top toolbar.

## What Changes

- One button shape: pill radius token for every button, icon button and segmented control; old radii and relic classes removed; a test fails on any other radius on a button.
- Centred labels: every text and icon button centres its content on both axes; an audit fixes each offender and a layout test measures label centring on the main pages.
- Activity ring and its start and stop control centred in their container at every size.
- Advanced creation form: two-option groups get a bounded width and centred layout instead of a full-width strip.
- Menus ordered by importance: toolbar, invite, export and voting menus follow a documented order (most used first, destructive last), the same in every mode.
- Voting bar on phones scrolls horizontally like the top toolbar instead of wrapping over the columns.

Out of scope: the component library choice (`design-system-components`), new features in these menus.

Bounded contexts: none (presentation only).

## Capabilities

### New Capabilities

- `ui-coherence`

### Modified Capabilities

None.

## Impact

- Web: shared CSS (`base.css`, tokens), toolbar, vote bar, dialogs, creation form, ring.
- Tests: design-token test extended, a layout test for centring, e2e order assertions.
- Docs: `docs/design-system.md` (radius rule and menu order table).
