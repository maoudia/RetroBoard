# Proposal

## Why

- The accessibility spec says axe runs on every route and dialog for each pull request. Pull requests run `pnpm e2e:core` (`.github/workflows/e2e.yml:42`) and `tests/e2e/core.json` lists no accessibility, contrast or keyboard spec. Nightly failed 5 of its last 6 runs on axe checks and production kept deploying.
- `contrast-themes.spec.ts:5` and `theme-contrast.spec.ts:4` list themes by hand, so a tenth theme would ship unchecked.
- The platform-security spec says the pipeline runs Lighthouse; no workflow does.

The derived-state contrast failures and forced colours are fixed by change `derived-states-contrast`.

## What Changes

- The accessibility, theme-contrast and keyboard specs join the push gate on Chromium once green; the e2e theme lists come from the themes package and also cover the chat panel and an open toolbar panel.
- Lighthouse: the maintainer adds the job, or the requirement is reworded to the local gate (task 1.4).

Out of scope: right-to-left, new themes, component primitives (change `design-system-components`), pseudo-locale (change `responsive-and-i18n-hardening`).

Bounded contexts: Platform (quality gate), UI (tests). Relay traffic: none.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `accessibility`: the gate that runs on pull requests.

## Impact

- `tests/e2e/core.json`, two e2e specs, `a11y.spec.ts` fixes, `docs/accessibility.md`, `docs/quality.md`.
