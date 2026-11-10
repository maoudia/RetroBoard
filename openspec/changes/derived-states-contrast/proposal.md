# Proposal

## Why

Theme tokens pass WCAG AA in all 18 variants, but states the stylesheet builds from them did not (production audit 2026-11-09).

- Pressed and expanded toolbar buttons put `--accent` on its own 16% tint (`apps/web/app/assets/css/base.css`): under 4.5:1 in 11 of 18 variants.
- Field placeholders were `--muted` at 85% opacity: under 4.5:1 in studio, sakura and minimal light.
- The note counter used fixed hex colours (`NoteCounter.vue`), and `docs/design-system.md` ("never hard-code a hex in a component") had no test behind it.
- No stylesheet had a `forced-colors` rule: note colours and pressed states disappear in Windows High Contrast.
- The chat unread badge had the same class of failure and was fixed by change `chat-badge-contrast`.

## What Changes

- A pressed or expanded toolbar button keeps the text colour, with an accent underline carrying the state; placeholders drop their opacity.
- `derivedPairs()` in `packages/themes` lists the pairs the stylesheet derives and a test holds each at 4.5:1 in every variant of every theme.
- The note counter uses theme tokens; a ratchet test refuses new hex colours in components (the existing fixed palettes, print, QR and avatars are the baseline and only shrink).
- A `forced-colors` layer: note borders, pressed outlines, primary button border.

Out of scope: the push gate (change `a11y-gate-and-derived-contrast`), right-to-left, new themes, component primitives (change `design-system-components`).

Bounded contexts: UI (themes, design system). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `themes`: derived states meet AA.
- `accessibility`: forced colours.

## Impact

- `apps/web/app/assets/css/base.css`, `NoteCounter.vue`, `packages/themes/src/color.ts` and its test, `apps/web/test/design-tokens.test.ts`, `tests/e2e/forced-colors.spec.ts`. Every theme and both variants; no format.
