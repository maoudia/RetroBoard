# Proposal

## Why

- The accessibility spec says axe runs on every route and dialog for each pull request. Pull requests run `pnpm e2e:core` (`.github/workflows/e2e.yml:42`) and `tests/e2e/core.json` lists no accessibility, contrast, keyboard or live-region spec. Nightly failed 5 of its last 6 runs on axe checks and production kept deploying.
- Theme tokens pass AA in all 18 variants, but three states built from them do not: the chat unread badge was `#fff` on `--danger` (2.26 to 2.82:1 in every dark variant; fixed by change `chat-badge-contrast`); pressed toolbar buttons put `--accent` on `--accent-soft` (`base.css:78`), under 4.5:1 in 11 variants; placeholders are `--muted` at 85% (`base.css:99`), under 4.5:1 in 3 light variants.
- No stylesheet has a `forced-colors` rule: note colours and pressed states disappear in Windows High Contrast.
- `contrast-themes.spec.ts:5` and `theme-contrast.spec.ts:4` list themes by hand, so a tenth theme would ship unchecked. `docs/design-system.md` forbids hex in components and nothing enforces it.
- The platform-security spec says the pipeline runs Lighthouse; no workflow does.

## What Changes

- The three states use colours that pass, and unit tests in `packages/themes` cover every derived pair used in `base.css`.
- A minimal `forced-colors` layer: borders on notes, system colours for pressed and focus.
- The accessibility, theme-contrast and keyboard specs join the push gate on Chromium once green; the e2e theme lists come from the themes package; the design-token test refuses hex outside marketing pages.
- Lighthouse: the maintainer adds the job, or the requirement is reworded to the local gate (task 2.4).

Out of scope: right-to-left, new themes, component primitives (change `design-system-components`), pseudo-locale (change `responsive-and-i18n-hardening`).

Bounded contexts: UI (themes, design system), Platform (quality gate). Relay traffic: none.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `themes`: derived states meet AA.
- `accessibility`: the gate that runs on pull requests, forced colours.

## Impact

- `apps/web/app/assets/css/base.css`, `ChatPanel.vue`, `NoteCounter.vue`, `packages/themes/src/color.ts` and its test, `apps/web/test/design-tokens.test.ts`, `tests/e2e/core.json`, two e2e specs, `docs/accessibility.md`.
- Every theme and both variants; no format.
