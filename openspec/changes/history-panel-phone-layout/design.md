# Design

## Root cause

| Symptom (owner screenshot) | Cause | Where |
|---|---|---|
| "Restore" under its icon, "before" overlaps the next row | a text button uses `.mini-btn`, a fixed 30 x 30 icon-only button | `apps/web/app/components/HistoryPanel.vue` (button, ~line 40), `apps/web/app/assets/css/base.css` (`.mini-btn`, ~line 81) |
| Last entry cut off, no scroll hint | two scroll containers: `.dd-panel` (`max-height: min(70dvh, 520px)`) and `.history` (`max-height: 50vh`); `vh` ignores the mobile browser bar | `Dropdown.vue` (`.dd-panel[popover]`), `HistoryPanel.vue` (`.history`) |
| Panel position ignores the bottom bars | `place()` flips above or below the trigger against `window.innerHeight`, with no knowledge of the presenter bar or the voting bar | `Dropdown.vue` (`place()`, ~line 17) |
| Panel closes when the browser bar collapses | `window.addEventListener('resize', close)`; iOS and Android fire `resize` while scrolling | `Dropdown.vue` (~line 47) |

## Audit: the three list panels (inconsistencies to remove)

| | History | Activity | Participants |
|---|---|---|---|
| Width (`Dropdown width`) | 340px | 280px | 300px |
| Inner padding | `.5rem .6rem` | `.5rem .6rem` | header `.3rem .5rem`, row `.35rem .5rem` |
| Row gap | `.5rem` | `.35rem` | `2px` |
| Scroll container | own `max-height: 50vh` inside the popover scroll | same | none (popover scrolls) |
| Row anatomy | time + text + action on its own row | time + text inline, wraps under the time | avatar + name + pills + actions, wraps |
| Heading | none (aria-label only) | none | visible uppercase `.head` |
| Empty state | `p.muted.empty` | `p.muted.empty` | none |
| Clock | `time()` copy, mono muted | `time()` copy, mono muted | n/a |
| Trigger ARIA | `aria-haspopup="dialog"`, panel is a region | same | no `aria-haspopup` |
| Icon-only action | `.mini-btn` misused with a label | n/a | `.mini-btn` (icon only, correct) |

## Decisions

- **Shared panel tokens in `base.css`**: `--panel-w: min(92vw, 22rem)`, `--panel-pad: var(--sp-2) var(--sp-3)`, `--row-gap: var(--sp-2)`; every list panel uses them. The three `width` props go away.
- **One scroll container**: only `.dd-panel[popover]` scrolls. Its max height is computed in `place()` from `window.visualViewport.height` minus `--reserved-top` and `--reserved-bottom` (CSS custom properties on `:root`, set by the toolbar and the presenter bar through their own resize observers) minus `env(safe-area-inset-*)`. A bottom fade (`mask-image` on the scroll container) signals more content; it is purely visual, the list stays keyboard-scrollable (`tabindex="0"` on the scroll container when it overflows).
- **Row anatomy**: a `PanelRow` pattern (CSS class pair, not a component, to keep the markup flat): `.row` is a grid `auto 1fr auto` = meta (time or avatar), body (what, wraps freely, `overflow-wrap: anywhere`), action (never wraps). Under 22rem the action keeps its place at the right; the body takes the remaining width.
- **Restore button**: `.btn-sm` pill with `lucide:rotate-ccw` and the short label, `white-space: nowrap`, `min-height: 40px`. The existing `history.restore.label` ("Restore before: {action}") remains the `aria-label`. New short strings: en "Restore", fr "Restaurer"; the confirm dialog keeps explaining "before this action".
- **Resize handling**: the popover closes on a *width* change (rotation, window resize) and on scroll of the page, not on a height-only change of the visual viewport; it re-places itself instead.
- **Clock**: one `formatClock(at, locale)` in `~/utils/time.ts`, with `font-variant-numeric: tabular-nums` so the times align in a column.
- **Where things live**: all app layer (components, utils, css). No domain, application or protocol change.

## Security and privacy note

Presentation only. The history text already goes through the hidden-column filter (`history.hidden`); that behaviour is unchanged. Nothing new leaves the browser and the relay sees nothing different.

## Risks

- `visualViewport` is missing in very old browsers: fall back to `window.innerHeight` (the current behaviour).
- Reserved insets set by other components must be removed on unmount: covered by the e2e that opens the presenter, closes it and reopens the panel.

## Implementation note (group 1)

Fixed bars (presenter bar, turn bar) mark themselves `data-reserve-bottom`; `Dropdown.vue` measures them at placement time and subtracts the occupied height from the room below the trigger, so no component needs to know about another. The panel height is the `--dd-max` custom property (visual viewport based) and a height-only resize re-places the panel instead of closing it; only a width change closes it.
