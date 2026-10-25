# Tasks

## 1. Timer events

- [x] 1.1 `timerEvents(prev, next, now)` (warning at 60 s, ended once per run, idempotent across reconnects and clock skew); verify unit tests and mutation score

## 2. Popups and notifications

- [x] 2.1 Popup queue service shared with talk-time popups and the name nudge; `PhaseEndPopup` alertdialog with megaphone, next phase, "Next phase" / "+2 min" / "OK", no focus steal while typing (fr/en); verify e2e with a short timer and axe
- [ ] 2.2 "1 minute left" toast, "Bob started Group" toast on open boards, personal settings (warning, system notification, sound off by default) with the Notification API asked on opt-in only; verify e2e (permission granted in Playwright) and unit tests
