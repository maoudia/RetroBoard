# Proposal

## Why

Owner request (2026-10-29): switch for good to Conventional Commits with one semantic version, and release automatically. Today release-please opens a release PR that someone has to merge by hand, the release carries no downloadable artifact, and nothing enforces the commit format. Releases then lag behind main (v1.3.0 is still unmerged) and a release can be cut on a red main.

## What Changes

- Conventional Commits are enforced: a local `commit-msg` hook, a check on every push to main and on every pull request (commits and PR title).
- One product version (SemVer) derived from the commits: `feat` bumps minor, `fix` and `perf` bump patch, `!` or a `BREAKING CHANGE` footer bumps major. The workspace packages stay private and unversioned; the root version is the single source.
- The release is automatic: when the main checks are green, the release PR is merged by the workflow, the tag `vX.Y.Z` and the GitHub Release are created, with `CHANGELOG.md` updated and the generated notes as the release body.
- Each release publishes a container image to GitHub Container Registry (`ghcr.io/maoudia/retroboard`) tagged `X.Y.Z`, `X.Y`, `X` and `latest`, for linux/amd64 and linux/arm64, with provenance. The image lets anyone self-host the site and the relay with `docker run`.
- ADR-0025 records the decision. `AGENTS.md`, `CONTRIBUTING.md` and the `retroboard-product-lead` skill state the rule.

Out of scope: the Cloudflare deploy (Workers Builds keeps deploying main), publishing `@retroboard/mcp` to npm (see `retro-mcp-and-agent-sessions`), signing images beyond build provenance.

Bounded contexts: Platform (delivery). Workflow edits are explicitly requested by the maintainer in the conversation of 2026-10-29 (AGENTS.md rule).

## Capabilities

### New Capabilities

- `release-delivery`

### Modified Capabilities

None.

## Impact

- `.github/workflows/release.yml` (rewritten), `.github/workflows/checks.yml` (commit check), `release-please-config.json`, `Dockerfile`, `.dockerignore`, `.githooks/commit-msg`, `scripts/commits/check.mjs` and its test, docs.
- Relay traffic and storage are unchanged: the image runs the same Worker code, memory only.
- Repository setting "Allow GitHub Actions to create and approve pull requests" is already in use by the current release PRs. If the owner adds branch protection to main, the bot needs a bypass.
