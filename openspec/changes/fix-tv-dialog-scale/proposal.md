# Proposal

## Why

Third batch of the CSS audit (owner note 2026-11-20): on a TV or projector (2400 px) dialogs keep their phone-sized text and width (the profile dialog is about 620 px wide in a 2400 px screen), unreadable from the room; and the closed password generator box on the setup form is taller than its summary because the closed content row still takes a grid gap.

## What Changes

- On `data-screen="tv"` dialogs scale up 1.5x, with their viewport caps divided by the zoom so they still fit.
- The closed generator box drops its gap.

Out of scope: behaviour, strings. The landing page has no dark variant by design (marketing page, exempt); not changed here. Web only, CSS.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-coherence`: dialogs are readable on TV.

## Impact

`apps/web/app/assets/css/base.css`, `apps/web/app/components/PasscodeField.vue`.
