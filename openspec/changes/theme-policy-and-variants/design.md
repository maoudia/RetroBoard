# Design

## Context

`ThemeDefinition` has one token set and `scheme`. Settings store has `themeMode`/`myTheme`. The theme plugin applies a board or seasonal theme globally, which leaks into the landing profile dialog.

## Goals / Non-Goals

**Goals:** two variants per theme; strict separation of product UI and board UI theming.
**Non-Goals:** per-column themes.

## Decisions

- `ThemeDefinition.variants: { light: Tokens, dark: Tokens }` plus `defaultVariant`. Fun themes may derive the missing variant with a tested algorithm (OKLCH lightness inversion) then hand-tune.
- CSS: board UI scoped under `[data-board-theme]` on the board root, not `<html>`. Product UI uses its own tokens on `<html>`. Dialogs opened from a board inherit the board scope; the profile dialog is mounted outside it.
- `variant` is a per-device setting (`light|dark|system`).
- Where it lives: themes package (data), `domain/facilitation` (theme change is a privileged event), web theme adapter.

## Risks / Trade-offs

- [Teleported dialogs lose scope] -> dialogs render inside the board root container instead of body.
- [Doubling palettes] -> contrast tests on both variants; visual regression covers both.
