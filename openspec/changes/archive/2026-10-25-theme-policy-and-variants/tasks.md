# Tasks

## 1. Theme model

- [x] 1.1 Add `variants` to `ThemeDefinition` and author light/dark tokens for all 9 themes; verify the contrast suite passes for 18 variants
- [x] 1.2 Remove `themeMode`/`myTheme` settings and migrate stored settings; verify unit test of settings migration

## 2. Scoping

- [x] 2.1 Moved to `theme-sync-and-new-themes` (theme scoping and the facilitator override bug, owner report 2026-10-25). Was: Scope board theming to the board root and keep product tokens on `<html>`; mount profile dialog outside board scope; verify e2e: profile from landing uses landing design after visiting a Halloween board
- [x] 2.2 Add variant switch (light/dark/system) in the board toolbar and profile; verify e2e two participants with different variants

## 3. Permissions

- [x] 3.1 Make theme change a facilitator-only event and show a read-only picker to others (fr/en); verify unit test (forged event ignored) and e2e
- [x] 3.2 Moved to agentic-delivery-harness 2.2 (visual regression). Was: Update visual regression baselines for both variants
