# Development setup

RetroBoard pins two tool versions that must match across every contributor's machine and CI: Node (`24`) and pnpm (`10.28.0`). This page covers getting them right on macOS, Linux and Windows. For the day-to-day commands (`pnpm verify`, `pnpm e2e`, commit conventions), see [CONTRIBUTING.md](../CONTRIBUTING.md).

- User guide and tutorial video: how to regenerate them, record the video and add a voice-over: [user-guide-howto.md](user-guide-howto.md).

## Option A: mise (recommended)

[mise](https://mise.jdx.dev) reads the project's `.mise.toml` and installs the exact pinned Node and pnpm for you, on any platform.

**macOS / Linux:**
```bash
curl https://mise.run | sh
```
(or `brew install mise` on macOS)

**Windows:** use WSL and follow the Linux steps above. mise does not support native Windows shells; `.mise.toml` and `mise.lock` still apply inside WSL.

Then, from the repository root:
```bash
mise install    # installs Node (from .node-version), pnpm 10.28.0 and the CI tools (actionlint, zizmor, osv-scanner, gitleaks, hadolint), pinned in .mise.toml and verified against mise.lock
pnpm install
```

`mise install` is reproducible: running it again reports "all tools are installed" and changes nothing. `mise.lock` pins the checksum of each tool for every platform (macOS, Linux glibc and musl, Windows), so a fresh install always resolves the same bits mise resolved when the lockfile was generated.

### Use the pinned Node

`mise doctor` warns when another Node comes first in `PATH` (for example Volta's). The commands then run on that Node, not on the pinned 24, and `node -v` shows it. Put `eval "$(mise activate zsh)"` (or your shell) after the other PATH changes in your shell profile, or prefix a command with `mise exec --` (`mise exec -- pnpm verify`).

### Other browsers for the e2e suite

Locally only Chromium is installed. mise does not manage Playwright browsers, so install the CI ones with Playwright itself, then turn the extra projects on with `CI=1`:

```bash
mise exec -- pnpm exec playwright install firefox webkit
CI=1 mise exec -- pnpm exec playwright test tests/e2e/<spec> --project=firefox --project=webkit --project=phone
```

Run `pnpm generate` first and again after each source change.

## Option B: manual (no mise)

mise is optional. Without it, install the two tools directly:

1. Install the Node version in `.node-version` (the current LTS; nodejs.org, or a version manager that reads that file: `nvm install`, `fnm use`, `volta pin`).
2. Install pnpm via Corepack (bundled with Node): `corepack enable`. Corepack reads `package.json#packageManager` (`pnpm@10.28.0`) and activates that exact version the first time you run `pnpm`, so it stays in sync with option A without needing mise.
3. `pnpm install`

## Scrum Poker (beta, in every build)

The `/poker` pages of the change `scrum-poker` (ADR-0042) are in every build and need no flag: `/poker` starts a room and `/poker/room#...` is the room. The landing page, the library page and the board menu link to them, marked "Beta". The pages are lazy routes with their own strings (`apps/web/app/poker/strings.ts`), so the landing page and the boards pay nothing for them; the shared bundle holds only the three entry labels (`poker.entry*`). `/poker/room` is a private prefix (never indexed, never in the sitemap); `/poker` is kept out of the index and the sitemap until its public page (task 7.1).

```bash
pnpm generate && pnpm dev:worker   # http://localhost:8787/poker (Worker, relay and site)
```

Try it with two or three tabs of the same browser (a second window works too; `localhost` is a secure context, a phone on the network is not, the browser refuses encryption there):

1. Tab 1: open `/poker`. Pick a deck chip (Fibonacci, modified Fibonacci, T-shirt, powers of 2): the round chips are the deck. Choose Custom to type your own cards separated by commas (`1, 2, 4, 8, ?`); the field exists only then. Optionally open "Card colours" and pick one of the eight hues (`CARD_HUES` of `packages/domain`, the avatar picker's eight): the moderator writes it with the deck in `settings.update { deck, hue }` before the first round and every card back of the room takes it (`--poker-back`, set on the room by `room.vue`; none picked, the lattice stays the theme's accent). Press "Create the room" (`PokerStep`: the button is fixed at the foot of a phone, 48 px, and in the flow from 600 px, 56 px), type a name (the same `PokerStep`, prefilled with the name of this browser) and join. You are the moderator.
2. Tab 1: press "Invite" in the bar (or the dashed seat while alone): the invite sheet (`InviteSheet`) shows the QR code and a filled "Copy link" that copies the participant link without showing it (the room page never prints the link). Open the link in tabs 2 and 3. Type another name in each and join. Every tab lists the three seats and the same deck. A link pasted in the join field of the landing page opens the room too.
3. Each tab picks a card from the hand: click it, or type its name (`5`, `1` then `3` for 13, `?`). The hand is in the dock at the foot of the screen (`PokerDock`, `PokerHand`), drawn by `PokerCard` (the one card of the room: a face, a back, an empty slot; the chosen card is lifted, ringed and checked); a deck of up to 14 cards wraps, a custom deck of 15 to 24 is one row that snaps sideways. A seat (`PokerSeat`) shows the avatar, the name on one line, a card back with a check (voted) or an empty slot with a clock (waiting), never the value, on every tab; the status line of the bar (`RoomBar`) says "3 of 6 voted" and at most one hint line follows the table of `apps/web/app/poker/room-view.ts`. On a phone the room is a bar, a middle region and a dock over `100dvh`: the page never scrolls, only the middle region may. Only the moderator has a Reveal button. From 600 px (`data-screen` tablet and up) `PokerTable` places the seats on an ellipse by CSS alone (`cos()` and `sin()` of `--a = 90deg + 360deg * --k / --n`, `--k` the place counted from the person, who is at the bottom centre; the DOM stays in join order; `@supports` keeps the phone grid elsewhere); the seat is 96, 80 or 64 px by count and `calc(... * var(--type-scale))` on a wide screen and a TV; the stage never gets shorter than the count needs (`--stage-min`), so no two seats overlap and the middle region scrolls instead. The round and the primary action (Reveal, Invite) are in the middle of the table (`useMedia` in `apps/web/app/poker/media.ts`). From 1024 px the results, or a quiet round panel with the hint before the reveal, are beside the table; on a tablet they are under it in two columns. `PokerCard` is a size container: under 41 px wide it drops its corners and sizes its value by its width.
4. Tab 1: press "Reveal". The hand leaves the dock and every seat flips its card (a 280 ms turn, the seats starting 10 ms apart up to 60 ms, no animation under `prefers-reduced-motion` or `data-motion="reduced"`; the value is only rendered once the ballot is open). `PokerResults` shows the average and the median as two large numbers, `ConsensusMeter` (a `role="meter"` whose text is the words of `consensusLevel`: 100% everyone, 75% strong, 50% some, below none), `CardDistribution` (a list, a column per card played with its count), the outlier lines (`outliers` of `packages/application/src/estimation/statistics.ts`: the lowest and the highest card that are not the most chosen, when the spread is over one step; the same icon on their seats) and the suggested card, which is "Use 5" for the moderator (`estimate.decide { round, card }`: the moderator only, a revealed round, a card of the deck, once per round, cleared by the next round; `Round.decided`) and text for a voter. The moderator's two buttons stay in the dock, Vote again on the left and Next round on the right; the filled one follows the agreement (`primaryOf`: Next round from 75%, Vote again below). A polite live region (`poker-live`, `announceOf` in `room-view.ts`) says the voted count, the reveal with its figures and the new round, once each. "Vote again" opens a new round on the same item, "Next round" a new one; each has a fresh key.
5. Reload a tab: the seat, the role and the card come back (they are kept in the tab's session storage; closing the tab ends the seat, and the moderator reopens the room with the moderator link).

What it is: a room on the real protocol (sealed envelopes, signed events, the relay), the real estimation domain folded by the shared ledger (a genesis with `kind: "poker"`), the decks and statistics of `packages/application/src/estimation/`, one card per voter per round, 20 voters at most (a 21st seat watches), French and English, the theme tokens. What it is not yet: the shared transport and the mesh, the passcode, stories, the timer (the next task groups of the change). A poker link opened as a board (`/boards#...`) is handed to the room page.

Tests: `pnpm exec vitest run apps/web/test/poker-client.test.ts packages/domain/test/estimation.test.ts packages/application/test/estimation-statistics.test.ts` (and the other `estimation`/`poker` tests of the packages) and `pnpm exec playwright test tests/e2e/poker.spec.ts` (three real tabs, the real relay, axe in light and dark; `CI=1 ... --project=phone` runs it on a phone-sized browser, `--project=webkit` on WebKit). The spec is part of the core gate (`tests/e2e/core.json`).

## Keeping the pins in sync

One Node version runs in development, CI and production, and `.node-version` is its only source. It is the current LTS (an even major); move it when the next LTS starts.

| File | Follows `.node-version` by |
|---|---|
| `.mise.toml` | reading it (`idiomatic_version_file_enable_tools`), with no second `node` pin; it also pins pnpm and the CI tools |
| `.github/workflows/*.yml` | `node-version-file: .node-version` in every `actions/setup-node` |
| `Dockerfile` | `FROM node:<major>-slim` in both stages (the production image) |
| `package.json` | `engines.node` (`>=<major>`) and the major of `@types/node` |
| Cloudflare builds | read `.node-version` from the repository root |

`scripts/quality/test/runtime-versions.test.ts` (part of `pnpm test`) fails when any of these drifts. To move to a new LTS: edit `.node-version`, run `mise install`, set the Dockerfile base images, `engines.node` and `@types/node` to the new major, then `pnpm verify`.

`pnpm` is pinned in `.mise.toml` and in `package.json#packageManager` (read by Corepack); keep those two equal when bumping it.
