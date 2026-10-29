# Proposal

## Why

Owner feedback (2026-10-29): themes make the product rich, but there is no design system for components; themes should only be CSS variations. Dropdowns are not visually explicit. The owner asks to evaluate the Hallmark design skill (usehallmark.com) to keep features coherent.

## What Changes

- ADR: design system approach (tokens and component primitives in packages/ui, themes as token sets only), including the Hallmark evaluation (license, cost, offline use, CSP).
- Primitives: Button, IconButton, Toggle, Segmented control, Badge, Select/Dropdown (chevron, current value, keyboard), Menu, Popover, Toast, Dialog.
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
