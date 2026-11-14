# Tasks

## 1. One zoom card

- [ ] 1.1 Extract `NoteZoom` from `PresenterSpotlight` with modes `presenter` (unchanged) and `zoom` (modal dialog, focus trap, focus return, live region), `ui.zoomNoteId`, neighbour handling when the note disappears, masked notes refused; verify that the existing presenter e2e specs pass unchanged, a new e2e of the zoom outside presentation mode, and axe

## 2. Gesture

- [ ] 2.1 `useNoteZoomGesture` (second tap within 300 ms and 10 px, drag and long press cancel, excluded targets, `touch-action: manipulation`), wired on notes and cluster stacks; verify unit tests of the timing and slop function and an e2e with touch emulation and a mouse double click, including that drag, vote, menu and a single tap are unaffected and not delayed (done early: `touch-action: manipulation` on notes and group stacks; open: the gesture itself)

## 3. Keyboard, menu and text

- [ ] 3.1 `z` in the shortcut table and help overlay, the "Zoom" item in the 3-dot menu, fr and en keys, live announcements; verify unit test of the table, e2e keyboard flow, the shortcuts-off case and the pseudo-locale overflow check
- [ ] 3.2 Phone and TV layouts of the zoom (full width card and bottom bar at 360 px, clamps on 2560 px); verify screenshots at both widths reviewed in the pull request and an e2e at each width

## 4. Guide

- [ ] 4.1 Guide step "Zoom on an idea" in the Write chapter (fr and en), regenerate with `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check` and the guide e2e
