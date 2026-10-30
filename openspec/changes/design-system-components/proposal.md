# Proposal

## Why

Owner feedback (2026-10-29): themes make the product rich, but there is no design system for components; themes should only be CSS variations. Dropdowns are not visually explicit. The owner asks to evaluate the Hallmark design skill (usehallmark.com) to keep features coherent.

Owner feedback (2026-10-30): do not build the design system from scratch. Start from the best and most mature library for Nuxt 4, then theme it with our tokens.

## What Changes

- ADR: design system approach (tokens and component primitives in packages/ui, themes as token sets only), including the Hallmark evaluation (license, cost, offline use, CSP).
- Base library chosen in the ADR after a spike. Candidates:
  - Nuxt UI v4: MIT, built on Reka UI and Tailwind CSS, more than 100 components, Pro components free since v4.
  - Reka UI alone: MIT, headless primitives, our CSS and tokens on top.
  - PrimeVue in unstyled mode.
  The spike measures for each the eager bundle (budget 260 kB), strict CSP (no inline style tags at runtime; build-time hashes only), accessibility and theming through CSS variables.
  Working hypothesis: Reka UI as the behaviour base, with Nuxt UI if its theming fits the CSP and the budget (a verifier in the spike).
- Primitives (wrapping the base library, never used directly in pages): Button, IconButton, Toggle, Segmented control, Badge, Select/Dropdown (chevron, current value, keyboard), Menu, Popover, Toast, Dialog.
- Component catalogue page in development builds, in light and dark for every theme.
- Themes reduced to tokens (colours, radius, fonts, motion); no theme-specific component CSS.
- Migration screen by screen with the existing e2e suite as the safety net.

Out of scope: new themes (themes-pop-culture), notes visuals (postit-visual-system).

Bounded contexts: Presentation only (packages/ui, packages/themes). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `themes`

## Impact

- New ADR; packages/ui primitives; web components migrated; a lint test on theme files.
