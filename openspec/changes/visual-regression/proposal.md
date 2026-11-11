# Proposal

## Why

Split from `agentic-delivery-harness` (task 2.2, 2026-11-11). Visual regression is the one PR gate of that change still missing: there is no `toHaveScreenshot` spec and no baseline workflow. Keeping the task there held the change open; it has no dependency on the rest of the harness.

## What Changes

- Screenshot checks of 12 key screens in 2 variants (light, dark) and 3 locales (fr, en, pseudo).
- A label-driven workflow that updates the baselines, so a deliberate visual change is reviewed as a diff.
- A diff artifact attached to the run when a screen changes.

Out of scope: any product change, other browsers than Chromium for the baselines.

## Capabilities

### New Capabilities

None. Tooling only, `skip_specs: true`.

### Modified Capabilities

None.

## Impact

- `tests/e2e` (screenshot spec and baselines), `.github/workflows/*` (baseline update workflow, needs a maintainer-approved workflow change).
- Uses the pseudo-locale and screen classes of `responsive-and-i18n-hardening`.
