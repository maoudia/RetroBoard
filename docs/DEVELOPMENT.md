# Development setup

RetroBoard pins two tool versions that must match across every contributor's machine and CI: Node (`24`) and pnpm (`10.28.0`). This page covers getting them right on macOS, Linux and Windows. For the day-to-day commands (`pnpm verify`, `pnpm e2e`, commit conventions), see [CONTRIBUTING.md](../CONTRIBUTING.md).

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
mise install    # installs node 24 and pnpm 10.28.0, pinned in .mise.toml and verified against mise.lock
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

1. Install Node 24 (nodejs.org, or a version manager like nvm/Volta: `nvm install 24` / `volta install node@24`).
2. Install pnpm via Corepack (bundled with Node): `corepack enable`. Corepack reads `package.json#packageManager` (`pnpm@10.28.0`) and activates that exact version the first time you run `pnpm`, so it stays in sync with option A without needing mise.
3. `pnpm install`

## Keeping the pins in sync

Three files currently repeat the Node/pnpm versions and must be updated together when either changes:

| File | What it pins |
|---|---|
| `.mise.toml` | `node`, `pnpm` (for `mise install`) |
| `package.json` | `packageManager` (pnpm, read by Corepack and pnpm itself) and `engines.node` (minimum, not exact) |
| `.github/workflows/*.yml` | `node-version` in `actions/setup-node`, and the `pnpm/action-setup` pin, repeated per workflow |

There is no automated check that these agree (see `openspec/changes/add-mise-for-multiplatform-development/proposal.md` for the deferred follow-up); update all three by hand when bumping a version.
