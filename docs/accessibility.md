# Accessibility

Target: WCAG 2.2 level AA (ADR-0022). The public statement is the page `/accessibility`
(`apps/web/app/pages/accessibility.vue`, texts in `packages/i18n`).

## What the build checks

- `tests/e2e/a11y.spec.ts`: axe with `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` on every
  route and dialog, in light and dark, on Chromium and the phone project. Every impact fails the build.
- `packages/themes` tests: contrast of every token pair for every theme and variant.
- `tests/e2e/accessibility-statement.spec.ts`: skip link, statement page and its footer link.
- `tests/e2e/live-regions.spec.ts` and `drag-alternatives.spec.ts`: announcements and drag alternatives.

Automated checks find part of the problems only. The manual checklist below is run before each
release that changes the interface, and the result is written in the release notes.

## Manual checklist (not run yet: the service is in beta)

Record the date, the tool and its version, and what failed.

| Area | How | Pass when |
|---|---|---|
| Keyboard only | Create a board, write and publish a note, vote, group notes, run the timer, export, using Tab, Shift+Tab, Enter, Space, arrows, Escape | Every action is reachable, focus is always visible, no keyboard trap, Escape closes dialogs and returns the focus |
| Skip link | Reload any page, press Tab once | "Skip to content" appears, Enter moves the focus into the main content |
| NVDA + Firefox (Windows) | Same flow as above | Landmarks, button names, state (pressed, expanded) and the live announcements are read once, in order |
| VoiceOver + Safari (macOS, iOS) | Same flow, with the rotor | Same as NVDA; menus (`role=menu`) are navigable |
| TalkBack + Chrome (Android) | Same flow on a phone | Same as NVDA; targets are reachable by swipe |
| Zoom 200% and 400% | Browser zoom, 1280 px wide window (400% is a 320 px layout) | No horizontal scroll except the columns carousel, no clipped text or controls |
| Text spacing | Apply the WCAG text spacing bookmarklet | Nothing is clipped or overlaps |
| Reduced motion | Turn on "reduce motion" in the system | No continuous animation, nothing important depends on motion |
| Forced colours | Windows high contrast | Controls and focus remain visible |
| Colour only | Greyscale view | Votes, phases and roles are understandable without colour |

## Where to fix what

- Menus and dropdowns: `apps/web/app/components/Dropdown.vue` (`menu` prop adds `role=menu`).
- Announcements: `useAnnouncer()`; new notes, phase changes and the vote reveal go through it.
- Targets, scroll padding: `apps/web/app/assets/css/base.css` (end of file).
- Theme tokens: `packages/themes`; a token pair under 4.5:1 (text) or 3:1 (UI) fails the unit test.
