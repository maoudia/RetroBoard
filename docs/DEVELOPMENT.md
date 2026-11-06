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
