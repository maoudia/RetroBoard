# Proposal

## Why

Last batch of the CSS audit (owner note 2026-11-20): right-to-left layout and long strings. With the 40 % longer pseudo-locale (`?lang=pseudo`) and with `dir="rtl"` forced, the layout mirrors correctly (logical properties already in use), but long strings break three places on a 360 px phone: segmented choices (Small, Normal, Large and the profile language choices) run past the dialog edge, rows of the Options and Profile dialogs grow wider than the dialog, and the phase line under the toolbar is cut mid-word instead of ending in an ellipsis.

## What Changes

- Segmented choices share the width and wrap their labels, with tighter padding under 420 px.
- Options rows wrap on phones; the Profile grid track is `minmax(0, 1fr)` so a wide choice cannot widen it.
- The phase line button shows an ellipsis (a flex button could not).

Out of scope: behaviour, strings, a real Arabic or Hebrew locale (none exists). Web only, CSS.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-coherence`: long strings stay inside their container.

## Impact

`base.css`, `OptionsDialog.vue`, `ProfileDialog.vue`, `PhaseStepper.vue`.
