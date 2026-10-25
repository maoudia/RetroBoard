# Tasks

## 1. Gate

- [x] 1.1 a11y.spec.ts on every route and dialog with `wcag2a`, `wcag2aa`, `wcag21aa`, `wcag22aa`, light and dark, chromium and phone, all impacts; fix what it finds; verify e2e
- [x] 1.2 Theme contrast unit test for every theme and variant (text 4.5:1, UI and large text 3:1); adjust tokens; verify packages/themes tests
  - Done: text, muted, accent, danger and success at 4.5:1 and accent2 at 3:1 on bg, bg2, surface and surface2 for every theme and variant; a derived `--control` border (3:1) now outlines every `.field`. Decorative `--border` (cards, separators) stays under 3:1 by design. Other bordered custom controls (switches, chips) are covered by the manual audit until they use `--control`.

## 2. Board criteria

- [ ] 2.1 `useAnnouncer()` with merged polite messages and assertive timer end; new notes, phase change, vote reveal wired; verify unit tests and e2e reading the live region
- [ ] 2.2 Drag alternatives ("Group with...", "Move up", "Move down") in note and group menus (fr/en); verify e2e keyboard only
- [ ] 2.3 Skip links, 24 px minimum targets, focus not obscured by toolbar and popups (scroll padding), reduced-motion versions; verify e2e and axe

## 3. Statement and process

- [ ] 3.1 `/accessibility` statement page (fr/en) linked from the footer, docs/accessibility.md with the manual checklist (NVDA, VoiceOver, TalkBack, keyboard, 200% and 400% zoom); verify e2e and axe
