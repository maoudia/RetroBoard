# Tasks

## 1. Attention model

- [ ] 1.1 Categories table, `AttentionEvent` and the pure `attentionFor` policy (focus rule, do-not-disturb, grouping, rate limit, privacy level) in packages/application with the attention state reducer; verify unit tests with fixtures (each category, burst, dnd, default privacy text, no idea text at the default level)
- [ ] 1.2 Derive attention events from the existing activity, talk, chat and action read models and the timer end; verify unit tests that a phase change, voting open, your turn, an assigned action, a chat reply and a new idea in my column produce the expected category

## 2. Tab surfaces

- [ ] 2.1 `useAttention` with visibility handling and the favicon dot or count adapter (canvas to data URL, restore, cache by count); verify unit test of the adapter and e2e that the favicon link changes while hidden and restores on return, and the CSP guard stays green
- [ ] 2.2 Title prefix, app badge adapter (feature detected) and the optional blink (off by default, never under reduced motion); verify e2e with `visibilitychange` and a stubbed `navigator.setAppBadge`

## 3. System notifications

- [ ] 3.1 Notification adapter over the existing `system-notify` (tag per category, grouping with a count, 5 s and 6 per minute limits, silent unless sound is on, click focuses the tab and opens the target panel); verify unit tests and e2e with a mocked `Notification`
- [ ] 3.2 Permission in context: the in-page offer on the first hidden-tab event, request only from a user gesture, refusal remembered; verify e2e that no prompt appears on load and that a refusal keeps the favicon working

## 4. Notification centre

- [ ] 4.1 Centre in the profile dialog (switches with importance in words, do-not-disturb with duration, sound, privacy level, supported-surfaces explanation) and the settings migration from `systemNotify`; verify unit test of the migration, e2e and axe light and dark, fr and en keys
- [ ] 4.2 Per-board overrides stored with the local recents and the toolbar do-not-disturb indicator; verify e2e with two boards

## 5. Away digest and polish

- [ ] 5.1 Away digest popup on return (polite live region, mark all read, auto-dismiss), quiet categories kept for the digest; verify e2e and axe
- [ ] 5.2 Pseudo-locale overflow at 360 px, reduced-motion checks, a test that nothing leaves the page when attention is raised (no extra relay message); verify e2e

## 6. Decisions and docs

- [ ] 6.1 ADR "Local attention and notifications without push" (refines ADR-0023), notification chapter in the user guide (manifest and fr/en text), `docs/accessibility.md` note, browser support table in `docs/`; verify `pnpm adr:check` and `pnpm docs:check`
