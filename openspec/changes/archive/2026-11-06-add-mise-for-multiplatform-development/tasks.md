# Tasks

## 1. Pin and lock

- [x] 1.1 Add `.mise.toml` pinning `node = "24"` and `pnpm = "10.28.0"` (matching `node-version` in `.github/workflows/checks.yml` and `packageManager` in `package.json`); verify `mise install` succeeds and `mise ls` shows both tools resolved
- [x] 1.2 Generate and commit `mise.lock` from `mise install`; verify the file is present and `mise install` is reproducible (`mise install` a second time reports nothing to do)

## 2. Docs

- [x] 2.1 Write `docs/DEVELOPMENT.md`: `mise install` setup for macOS, Linux and Windows (WSL), the manual fallback (install Node 24 and pnpm 10.28.0 directly, or via Corepack) for contributors who skip `mise`, and which files (`.mise.toml`, `package.json#packageManager`, workflow `node-version`) must move together when the pinned version changes; verify the commands in the doc match what `.mise.toml` and `package.json` actually pin
- [x] 2.2 Add a one-line pointer to `docs/DEVELOPMENT.md` / `mise install` in `README.md`'s Quick start, ahead of the existing `pnpm install` step, without removing the existing manual steps; verify `pnpm verify` still passes (doc-only change, no CSP/behaviour impact)

## Workflow follow-up

- CI integration (`jdx/mise-action`, a `mise-check.yml` validation workflow, a weekly tool-update workflow) is out of scope for this change (see proposal.md); open a separate change before editing `.github/workflows/**`.
- Archive this change once both groups are done and `pnpm verify` is green.
