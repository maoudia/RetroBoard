# Tasks

## 1. Architecture spike and domain

- [ ] 1.1 Spike and ADR (done and verified on 2026-11-21, see ADR-0042, with the runnable demo behind `NUXT_PUBLIC_POKER_DEMO=1` of `docs/DEVELOPMENT.md`; the box stays open only because ticking it makes this the sixth change in progress and `pnpm wip` allows five, so tick it when a change closes): confirm a poker room as a second room kind on the existing transport (envelope, key fragment, join code, passcode, mesh and relay fallback) with no relay-visible kind marker, whether the sealed-ballot mechanism carries a per-round key as is, the voter cap against `packages/protocol/src/budgets.ts` and the free-plan message budget of a 20-person room; finalise the ADR written with this change (`pnpm adr:check`) and amend it if the spike disagrees; verify a throwaway two-context test that opens a room, exchanges a sealed vote and reveals it, and the budget arithmetic recorded in the ADR
- [ ] 1.2 `packages/domain/src/estimation/` and the seams the spike found (ADR-0042): `PokerState`, the commands and reducer of `design.md`, sealed vote handling (one card per voter per round, the cap of 20 voters), replay; the kind in the genesis and a kind-aware `foldEvent` with a poker privilege set, the board path untouched; the round key, seal and open in a new file of `packages/crypto`; the poker body in `packages/protocol`; verify unit tests including replay equality across two replicas, reveal refused before everyone's sealed card is in when auto-reveal is on, a late change refused after the reveal, a second genesis or a foreign-kind event ignored, the 21st voter ignored, the existing ledger and board tests unchanged, and `pnpm arch` (no I/O, no framework)
- [ ] 1.3 `packages/application/src/estimation/`: decks, statistics (average, median, mode, spread, consensus, suggestion, outliers, ordinal decks), session summary; verify unit tests with fixed rounds for every deck, non-numeric cards and ties, and mutation-test friendly pure functions

## 2. The room

- [ ] 2.1 `/poker` start page and the `/poker/room` route (the room id stays in the fragment) in `APP_ROUTES`, the room page in `PRIVATE_PREFIXES`, `/poker/room#` allowed for the joiner of a code, a poker link opened as a board (and the reverse) shows a hint, room creation (name, deck), share (link, QR, short code), join with a name only, moderator, voters and observers, presence and reconnection through the shared transport and replica, the send taking any event body; verify e2e with three contexts (create, join by link, join by code, reload keeps the seat and the own card, no request carries the room id) and the relay contract tests unchanged
- [ ] 2.2 Passcode, "everyone moderates" option and moderator transfer (free between rounds, a new round when the role moves in the middle of one); verify e2e and that a participant cannot reveal or decide

## 3. The table and the round

- [ ] 3.1 Table, seats, hand of cards (radio group, digit keys, thumb-sized hand on a phone), face-down cards, voted marks, reveal with a themed flip (no motion under reduced motion), the numbers shown to everyone at once; verify e2e of a full round with three voters and an observer, axe, keyboard-only play, phone to TV layouts and the pseudo-locale overflow check
- [ ] 3.2 Results panel: average, median, mode, spread, consensus meter with text, outlier cards with the "please explain" timer from the talk-time timer, suggestion, re-vote with round history; verify unit-backed e2e and axe (nothing by colour alone)
- [ ] 3.3 Countdown, auto-reveal when everyone has voted (sent by the device that opened the round), and the quick-estimate mode; verify e2e with fake timers

## 4. Stories and decisions

- [ ] 4.1 Backlog: add, paste a list (one story per line, keys recognised), reorder, select the current story, decide the final estimate, next story, edit and remove, a pasted list sent in batch events of at most 50 stories and 16 KiB (the fold ignores an author's events beyond 60 per 10 seconds); verify unit tests of the list parser and e2e; the importer of `jira-estimation-import` plugs in here
- [ ] 4.2 Session summary (stories, estimates, total, rounds to consensus) and "paused or finished" in the local library; verify e2e of closing and reopening a room from the library

## 5. Decks and settings

- [ ] 5.1 Preset decks (Fibonacci, modified Fibonacci, T-shirt, powers of two, hours, days) with `?` and the coffee card, custom deck editor with validation, the team's default deck in the local team space; verify unit tests of the deck validation and e2e of a custom deck
- [ ] 5.2 Themes on the table and the cards in the nine retro themes in light and dark, emoji throws as live frames within a small fixed budget (never in the log, at most 60 per 10 seconds per socket); verify the contrast spec, screenshots reviewed in the pull request and the relay budget test

## 6. Results, export and sync

- [ ] 6.1 Export of the summary through the doors of `export-consolidation` (Markdown, CSV with a column layout that Jira's CSV import accepts, JSON, a copyable text card); verify exporter snapshot tests and e2e
- [ ] 6.2 Poker rooms as library entries that sync through the vault (`user-drive-storage`) and in the sealed vault file (`sync-ux`); verify the plaintext canary test with story titles and e2e with two contexts

## 7. Public page and launch

- [ ] 7.1 `/poker` landing page in fr and en in the style of the format pages (one action, why it is private, FAQ, structured data, sitemap, indexing flag respected), guide chapter, landing link; verify Lighthouse budgets, axe, the pseudo-locale check, `pnpm docs:tour && pnpm docs:guide` and `pnpm docs:check`
