# Tasks

## 1. Decision

- [ ] 1.1 Spike: Dropdown and Dialog built with Nuxt UI v4, Reka UI alone and PrimeVue unstyled, measured on bundle size, CSP (no console violation in e2e), axe and theme switching; verify the measurements table in the ADR
- [ ] 1.2 ADR (MADR) choosing the base library, including the Hallmark evaluation; verify `pnpm adr:check`

## 2. Primitives

- [ ] 2.1 Token layer and Button, IconButton, Toggle, Segmented, Badge in packages/ui with the catalogue page; verify axe on the catalogue for every theme in light and dark
- [ ] 2.2 Select/Dropdown, Menu and Popover primitives (explicit chevron, current value, keyboard); verify e2e keyboard and axe

## 3. Migration

- [ ] 3.1 Migrate toolbar, vote bar and dialogs; every on/off control becomes the rounded Toggle switch (owner, 2026-11-01); verify the e2e suite stays green and no on/off button remains
- [ ] 3.2 Migrate notes, columns and composer; verify the e2e suite stays green
- [ ] 3.3 Theme files hold tokens only; verify a test that fails on component CSS in a theme
