# Proposal

## Why

Owner feedback (2026-11-01): the design choice is an icon at the left of a button label, but some buttons have none (for example the erase confirmation, Cancel, Close, Apply). The mix looks unfinished. One rule, enforced by a test, keeps it coherent.

## What Changes

- Every button, link-button and dialog action that shows a word (`.btn`) gets a Lucide icon at the left of its label, from a small shared vocabulary: cancel and close `x`, confirm and apply `check`, delete `trash`, erase and reset `eraser`, next `arrow-right`, back and leave `arrow-left` or `log-out`, home `house`, save `save`, keep and later `clock`.
- `ConfirmDialog` takes an optional `confirm-icon` (default `check`, `trash` when dangerous) so each confirmation says what it does.
- Exceptions stay icon-less by design: numeric or status chips (`+1`, `+3`, vote scores, status pills) and toggle segments.
- `docs/design-system.md` states the rule and the vocabulary; `apps/web/test/design-tokens.test.ts` fails on a labelled `.btn` without an icon.

Out of scope: icon-only buttons (they keep their accessible name), marketing pages.

Bounded contexts: UI only. No protocol, no relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `themes`

## Impact

- Web: dialogs, popups and pages listed by the guard test; `docs/design-system.md`; one new guard test. i18n unchanged.
