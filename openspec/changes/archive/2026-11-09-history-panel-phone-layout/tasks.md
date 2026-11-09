# Tasks

## 1. Panel primitives

- [x] 1.1 Panel tokens in `base.css` (`--panel-w`, `--panel-pad`, `--row-gap`, row grid classes) and `~/utils/time.ts` `formatClock` with tabular digits; verify unit test of `formatClock` (12 h and 24 h locales) and the design-token test
- [x] 1.2 `Dropdown.vue` fits the visual viewport: max height from `visualViewport`, reserved top and bottom insets and safe areas, one scroll container with a bottom fade, `tabindex` when it overflows, close on width change only; verify e2e at 360 x 640 with the presenter bar open and a height-only resize

## 2. History panel

- [x] 2.1 Rebuild the entry layout (`auto 1fr auto` row, wrapping body, nowrap restore pill with icon, 40 px target), short fr and en labels, accessible name kept; verify e2e `history-panel-layout` at 360 and 390 px with a 40-entry fixture (no intersection between entries, no horizontal overflow, panel inside the viewport) and axe

## 3. Coherence

- [x] 3.1 Move Activity and Participants to the shared tokens and row anatomy, remove the per-panel widths and `max-height`s, align trigger ARIA and empty states; verify e2e that measures width, padding and gap of the three panels and the existing activity, presence and roles specs
- [x] 3.2 Guard in `apps/web/test/design-tokens.test.ts`: a `.mini-btn` with visible text fails; verify the test fails on a seeded violation

## 4. Docs

- [x] 4.1 `docs/design-system.md`: list panels and the row anatomy; guide manifest entry if a photographed panel changes (`pnpm docs:tour && pnpm docs:guide`); verify `pnpm docs:check`
