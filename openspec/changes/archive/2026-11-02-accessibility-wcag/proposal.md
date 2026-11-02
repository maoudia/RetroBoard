# Proposal

## Why

Owner request (2026-10-25): support an accessibility standard for the site. Today axe runs on a few pages (tests/e2e/a11y.spec.ts, WCAG 2.1 A/AA, serious and critical only) and keyboard shortcuts are planned, but there is no stated target, no accessibility statement, and the board itself (drag and drop, live updates, timer, popups) is not audited.

## What Changes

- **Target: WCAG 2.2 level AA** (ADR-0022). It contains WCAG 2.1 AA, so it also covers EN 301 549 (European Accessibility Act) and today's RGAA 4.1.2, and matches the announced RGAA 5.
- **Automated gate**: axe with the `wcag22aa` tags on every route and every dialog, in light and dark, phone and desktop; all impacts fail, not only serious and critical. Theme tokens checked by a unit test (text 4.5:1, large text and UI parts 3:1) for every theme and variant.
- **Board fixes** for the criteria axe cannot see:
  - 2.5.7 Dragging movements: every drag (move a note, group, reorder) has a menu or keyboard alternative.
  - 2.5.8 Target size: at least 24 by 24 CSS pixels for every control.
  - 2.4.11 Focus not obscured: sticky toolbar, toasts and popups never hide the focused element.
  - 4.1.3 Status messages: new notes, phase changes, timer end and vote reveal announced in polite live regions, rate-limited.
  - 2.4.1 Bypass blocks: a skip link to the board and one per column.
  - 2.2.1 Timing: timers never end a user's input; drafts are kept.
  - 2.3.3 and reduced motion: every animation has a reduced-motion version.
- **Accessibility statement** page (fr/en, `/accessibility`) with the conformance status, the known limits, the audit date and a contact (GitHub issue form), linked from the footer.
- **Manual audit checklist** per release: NVDA with Firefox, VoiceOver with Safari (macOS and iOS), TalkBack with Chrome, keyboard only, 200% and 400% zoom.

Out of scope: certification by an external auditor (later, if a customer needs it).

Bounded contexts: all of the web app; no domain change. No relay traffic.

## Capabilities

### New Capabilities

- `accessibility`: conformance target, automated gate, board criteria, statement.

### Modified Capabilities

None.

## Impact

- Tests: a11y.spec.ts extended to all routes and dialogs; theme contrast test in packages/themes.
- Web: skip links, live region service, drag alternatives, target sizes, focus handling with sticky elements, `/accessibility` page.
- Docs: docs/accessibility.md (manual checklist, how to report).
- ADR-0022.
