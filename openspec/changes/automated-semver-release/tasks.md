# Tasks

## 1. Conventional Commits

- [x] 1.1 `scripts/commits/check.mjs` with unit tests, `.githooks/commit-msg`, hook install on `pnpm install`; verify a bad message is rejected and a good one accepted
- [x] 1.2 Commit check in `checks.yml` (push range and pull request commits plus title); verify with actionlint and a dry run on the last 20 commits of main

## 2. Automatic release

- [ ] 2.1 `release-please-config.json` sections (feat, fix, perf, refactor visible), `release.yml` with gate, auto-merge of the release PR, second release-please pass; verify with actionlint and a dispatch dry run
- [x] 2.2 ADR-0025 and docs (`CONTRIBUTING.md`, `AGENTS.md`, `docs/PLAN.md` 10.2)

## 3. Container image

- [ ] 3.1 `Dockerfile` and `.dockerignore`; verify `docker build` and `docker run` serve the site and a WebSocket room on port 8787
- [ ] 3.2 Image job in `release.yml` (GHCR login with `GITHUB_TOKEN`, metadata tags, buildx amd64 and arm64, provenance); `docs/self-hosting.md`

## 4. First automatic release

- [ ] 4.1 Release v1.3.0 through the new flow once main is green; verify the tag, the GitHub Release, the changelog and `docker pull ghcr.io/maoudia/retroboard:1.3.0`
