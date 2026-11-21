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

## Scrum Poker demo (behind a flag, off by default)

The `/poker` pages of the change `scrum-poker` (task 1.1, ADR-0042) exist only in a site generated with `NUXT_PUBLIC_POKER_DEMO=1`. A normal `pnpm generate` has no `/poker` route, no poker code and no poker string, so nothing changes for a user and the bundle budget is untouched. The flag is read at build time: change it, generate again.

```bash
NUXT_PUBLIC_POKER_DEMO=1 pnpm generate && pnpm dev:worker   # http://localhost:8787/poker (Worker, relay and site)
```

Try it with two tabs of the same browser (a second window works too; `localhost` is a secure context, a phone on the network is not, the browser refuses encryption there):

1. Tab 1: open `/poker`, press "Start a room" (or "Démarrer une salle"), type a name and join. You are the moderator.
2. Tab 1: press "Copy link" and open it in tab 2. Type another name and join. Both tabs now list two seats.
3. Each tab picks a card from the hand. A seat shows "Has voted" and a face-down card, never the value, on both tabs. Only the moderator has a Reveal button.
4. Tab 1: press "Reveal". Every card flips at once on both tabs. "New round" starts the next vote with a fresh key.

What it is: a minimal room on the real protocol (sealed envelopes, signed events, the relay), one card per voter per round, a Fibonacci deck, French and English, the theme tokens, 20 voters at most. What it is not: the real transport and domain (they come with tasks 1.2 and 2.1), the mesh, results, stories, the passcode. A voter's seat survives a reload of the tab (kept in the tab's session storage); closing the tab ends it.

Tests: `pnpm exec vitest run apps/web/test/poker-demo.test.ts` (sealing, fold, two clients through a relay stand-in) and, against a flagged site, `E2E_PORT=8791 pnpm exec playwright test tests/e2e/poker-demo.spec.ts --project=chromium` (two real tabs, the real relay, axe in light and dark). The e2e spec skips itself on a normal build.

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
