# Tasks

## 1. Decision

- [ ] 1.1 ADR (MADR) on the design system, including the Hallmark evaluation; verify `pnpm adr:check`

## 2. Primitives

- [ ] 2.1 Token layer and Button, IconButton, Toggle, Segmented, Badge in packages/ui with the catalogue page; verify axe on the catalogue for every theme in light and dark
- [ ] 2.2 Select/Dropdown, Menu and Popover primitives (explicit chevron, current value, keyboard); verify e2e keyboard and axe

## 3. Migration

- [ ] 3.1 Migrate toolbar, vote bar and dialogs; verify the e2e suite stays green
- [ ] 3.2 Migrate notes, columns and composer; verify the e2e suite stays green
- [ ] 3.3 Theme files hold tokens only; verify a test that fails on component CSS in a theme
