# Proposal

## Why

Owner note (2026-11-20): misaligned and overflowing controls on a phone, and general visual polish. A CSS audit of the main screens at 360, 768, 1440 and 2400 px (light and dark, three themes) found that on touch screens the small controls are under 44 px: column and dialog `.mini-btn` (30 px), toolbar `.icon-btn` (37 px high), the avatar, the logo, the agenda ring and the stepper buttons. It also found that the lock icon of the profile intro shrinks to a speck inside its flex row.

## What Changes

- On coarse pointers, small controls keep their look and their layout but answer to a 44 px square: the hit area grows outwards through a pseudo-element (`base.css`).
- The profile intro icon keeps its size (`ProfileDialog.vue`).
- A guard e2e checks the hit area of the toolbar and column buttons on a touch screen.

Out of scope: moving or resizing any control, the desktop pointer, any behaviour change.

Bounded contexts: web only, CSS. No domain, protocol or relay change; no free-plan impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-coherence`: touch targets of 44 px, guaranteed by a test.

## Impact

- `apps/web/app/assets/css/base.css`, `apps/web/app/components/ProfileDialog.vue`, `tests/e2e/touch-targets.spec.ts`.
