# Tasks

## 1. Placement model

- [ ] 1.1 Pure `chat-dock` module: `dock` (nearest edge, corners, tie rule), `rest` (fractions to pixels with safe-area insets, avoided rectangles, keyboard), migration of the old pixel key; verify unit tests with fixtures at 360x740, 1280x800 and 2560x1440 including rotation and a full edge
- [ ] 1.2 Settings keys `chatDock` and `chatPlace` (local, validated, defaults), reset; verify unit tests of the store and that nothing is written to the board or sent

## 2. The button

- [ ] 2.1 Bubble drag with slop, snap spring and reduced-motion jump in `ChatPanel.vue`, `data-avoid-chat` on the toolbar, presenter bar and composer actions, keyboard handling via `visualViewport`; verify e2e at 360 and 1280 px (drag to each edge, corner, rotate, keyboard open) and that board scrolling is unaffected
- [ ] 2.2 Badge on the inner corner, drawer side follows the edge; verify e2e with unread messages on the left and right edges

## 3. Without dragging and in the profile

- [ ] 3.1 Button menu (long press, context-menu key, Shift+F10) with Move mode (arrows, Enter, Escape, polite announcement); verify e2e with the keyboard only and axe
- [ ] 3.2 Profile > Chat button: snap or free, eight-place picker, reset (fr/en, 44 px targets); verify e2e and axe light and dark

## 4. Guide and docs

- [ ] 4.1 Update the guide manifest step and chapter text (fr/en) for the chat button, regenerate with `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`
