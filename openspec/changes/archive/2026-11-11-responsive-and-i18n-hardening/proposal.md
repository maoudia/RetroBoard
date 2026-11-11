# Proposal

## Why

Some labels overflow or get cut in French and English on small screens, and the board was designed for laptops. Retros happen on phones, laptops, meeting-room TVs and projectors.

## What Changes

- Responsive system from 360 px to 4K with five breakpoints and container queries.
- Presenter mode for TV/projector (large type, high-contrast variant, QR code to join, no cursors).
- Fix label overflow (toolbar, segmented controls, dialogs, vote bar) with wrapping rules and icon-only fallbacks with accessible names.
- Pseudo-locale (+40% length, accents, brackets) used in CI visual and overflow checks.
- Phone layout: one column at a time with swipe and a column switcher; bottom sheets for menus.

Out of scope: native apps.

## Capabilities

### New Capabilities

- `responsive-layout`: supported screen classes and presenter mode.

### Modified Capabilities

- `i18n`: adds no-truncation and pseudo-locale requirements.

## Impact

- Web components and CSS, i18n package (pseudo-locale), quality workflow.
- Free-plan budget: none.
