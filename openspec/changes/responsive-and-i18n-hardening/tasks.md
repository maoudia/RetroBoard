# Tasks

## 1. Foundations

- [ ] 1.1 Define breakpoints, fluid type scale and `data-screen` in UI tokens; verify a unit snapshot of generated CSS variables
- [ ] 1.2 Add the pseudo-locale generator and `?lang=pseudo` on previews; verify unit test (length +35-45%, markers)

## 2. Layout

- [ ] 2.1 Phone layout: column pager, tab bar, bottom-sheet menus; verify e2e at 360 px for write, vote, publish, group via menu
- [ ] 2.2 Toolbar and vote bar overflow fixes with icon-only fallbacks and accessible names; verify the overflow test at 360/768/1440 in fr, en, pseudo
- [ ] 2.3 Wide and TV layouts (min 24 px note text at 3840 px); verify visual regression at 2560 and 3840

## 3. Presenter mode

- [x] 3.1 Presenter mode toggle with high-contrast variant, QR join code (generated locally) and hidden cursors; verify e2e and that the QR encodes the participant link without the facilitator secret
- [ ] 3.2 Touch long-press grouping and moving; verify e2e with touch emulation on a tablet viewport
