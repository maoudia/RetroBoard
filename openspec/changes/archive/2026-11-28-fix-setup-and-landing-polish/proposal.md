# Proposal

## Why

Second batch of the CSS audit (owner note 2026-11-20): the remaining six themes and dark mode at 360, 768, 1440 and TV widths show visible defects: the sticky create button of the phone setup form lets the form text run under it, the passcode icon buttons sit above the field line, the "Scan a QR code" button on the landing page is an unstyled browser button (the scanner component has several roots, so the page's scoped rules do not reach it), the Simple/Advanced switch is cramped against the text in dialogs, the default-theme select is truncated in the profile, the filter colour swatches are 22 px, and segmented choices are 33 px high on touch screens.

## What Changes

- Soft fade behind the sticky create button on phones; passcode row and mode bar centred on their line; scan button styled through `:deep`; breathing room around the mode switch; select keeps its width; swatches 24 px with a larger touch area; segmented choices 44 px high on coarse pointers.

Out of scope: behaviour, strings, desktop pointer metrics. Web only, CSS.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `ui-coherence`: the landing join controls share one style.

## Impact

`BoardSetupForm.vue`, `PasscodeField.vue`, `pages/new.vue`, `pages/index.vue`, `ModeSwitch.vue`, `ProfileDialog.vue`, `BoardFilter.vue`, `base.css`.
