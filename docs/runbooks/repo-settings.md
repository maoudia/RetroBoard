# Repository settings (maoudia/RetroBoard)

Settings that cannot live in files. Apply once, then keep this list in sync.

## Branch protection on `main` (or a ruleset)

- Require a pull request before merging, 1 approval, dismiss stale approvals. The maintainer may
  bypass for direct pushes while the project is in solo mode.
- Required status checks: `Specs, lint, types, architecture, unit`, `Static build, bundle budget,
  Worker dry run`, `Workflow lint (actionlint, zizmor)`, `Playwright (chromium)`, `CodeQL`.
- Require branches to be up to date; enable the merge queue when more than one agent works at once.
- Block force pushes and deletions.

## Actions

- Settings > Actions > General: "Read repository contents" default token permissions; allow
  GitHub Actions to create and approve pull requests (needed by release-please).
- Secrets: `CLAUDE_CODE_OAUTH_TOKEN` (run `claude setup-token`), `ANTHROPIC_API_KEY` (OpenCode).
- Variables: `PROD_URL` (smoke tests, e.g. `https://retroboard.maoudia.com`), `OPENCODE_MODEL`
  (OpenCode model id, `provider/model`).
- Install the Claude GitHub App (`/install-github-app` in Claude Code) and, for OpenCode,
  `opencode github install`.

## Security

- Settings > Code security: enable secret scanning and push protection (free for public
  repositories), Dependabot alerts and security updates, private vulnerability reporting.

## Project board

- Create a GitHub Project (table or board), add a "Status" field, and enable the "Auto-add to
  project" workflow for `repo:maoudia/RetroBoard is:issue`. Existing issues are added once from
  the project with "Add items".
