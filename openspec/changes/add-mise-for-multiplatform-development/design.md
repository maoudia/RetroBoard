# Design

## Context

Toolchain versions are pinned in three places that must agree: `package.json#engines.node` (`>=22`, loose), `package.json#packageManager` (`pnpm@10.28.0`, exact), and every `.github/workflows/*.yml` job (`node-version: 24` plus a SHA-pinned `pnpm/action-setup`). Nothing checks that a contributor's local Node/pnpm match what CI uses; drift only surfaces as a confusing local failure or a `pnpm install --frozen-lockfile` mismatch. `mise` is a single static binary (already available via Homebrew, curl, or the project's own first run) that reads one `.mise.toml` and activates pinned tool versions per shell (direnv-style `cd` hook) or via `mise exec`/`mise run`.

## Goals / Non-Goals

**Goals:**
- One command (`mise install`) gets a contributor the exact Node and pnpm versions the project (and CI) use.
- `mise.lock` pins tool checksums so `mise install` is reproducible across macOS, Linux and Windows (WSL).
- Document the setup path for all three platforms in one place.

**Non-Goals:**
- Changing CI to use `mise` (`jdx/mise-action`): that touches `.github/workflows/**`, which AGENTS.md reserves for an explicit maintainer request per workflow file, not bundled into a tooling change. Tracked as a follow-up, not a task here.
- A `mise-check.yml` or weekly tool-update workflow: same reason, deferred.
- Pinning `wrangler`, `playwright` or `openspec` CLI versions in `.mise.toml`: those are already pinned as devDependencies in `package.json` and installed through `pnpm install`, so a second pin in `mise` would be a second source of truth to drift. `.mise.toml` only owns what `package.json` cannot pin for a fresh shell: the Node runtime and the pnpm package manager itself.
- Replacing `packageManager` or `engines`: both stay as-is; `.mise.toml` mirrors them instead of superseding them, since tools other than `mise` (Corepack, Volta, CI) still read those fields.

## Decisions

- `.mise.toml` pins `node = "24"` and `pnpm = "10.28.0"`, read from the current `node-version` in workflows and the current `packageManager` field respectively. Keeping both in sync is a manual step today (noted in `docs/DEVELOPMENT.md`); automating that sync is the out-of-scope weekly-update workflow.
- `mise.lock` is generated with `mise install` and committed, so every platform resolves the same tool build (mirrors the intent of `pnpm-lock.yaml`).
- `docs/DEVELOPMENT.md` is a new, single page (not folded into `CONTRIBUTING.md`, which stays focused on the contribution process) covering: install `mise`, run `mise install`, then the existing `pnpm install`. It documents the non-`mise` fallback (install Node 24 and pnpm 10.28.0 by hand, or via Corepack) for contributors who skip `mise`, since `mise` stays optional, not required, in this change.
- `README.md` quick start gets one added line pointing to `docs/DEVELOPMENT.md` / `mise install`, ahead of the existing `pnpm install` step; the existing steps are not removed, so nothing breaks for contributors who do not use `mise`.

## Risks / Trade-offs

- **Drift between `.mise.toml` and CI/`package.json`**: nothing enforces the three pins stay equal (that enforcement is the deferred `mise-check.yml`). Mitigation: `docs/DEVELOPMENT.md` states explicitly which files must move together when the Node or pnpm version changes.
- **Another tool to install**: `mise` is optional in this change (local dev convenience only); a contributor without it still follows the pre-existing manual steps, so there is no hard new requirement.
- **`mise.lock` churn**: tool checksums can change across `mise` releases; this is treated like `pnpm-lock.yaml` churn (reviewed, not blocked) and not automated here.
