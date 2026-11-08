# Repository settings (maoudia/RetroBoard)

Settings that cannot live in files. Apply once, then keep this list in sync.

## Branch protection on `main` (ruleset "main")

Applied by the maintainer tooling (`gh api repos/maoudia/RetroBoard/rulesets`); keep this list in sync with it.

- Pull request required, no required approval while the project has one maintainer (add 1 approval with a second one).
  Rebase merge for agent pull requests (a squash merge is authored by the GitHub account of whoever merges and adds a `Co-authored-by` trailer, which the one-author rule refuses; squash stays allowed for the release and Dependabot bots), linear history, branches deleted after merge, auto-merge allowed.
- Required status checks: `Specs, lint, types, architecture, unit`, `Static build, bundle budget, Worker dry run`,
  `Workflow lint (actionlint, zizmor)`, `Conventional Commits`, `Playwright (chromium 1/2)`, `Playwright (chromium 2/2)`,
  `CodeQL`, `Mutants of the changed files`.
- Block force pushes and deletions. The repository admin can bypass in an emergency (pull requests only otherwise).

## Actions

- Settings > Actions > General: "Read repository contents" default token permissions; allow
  GitHub Actions to create and approve pull requests (needed by release-please).
- Secrets: `CLAUDE_CODE_OAUTH_TOKEN` (run `claude setup-token`), `ANTHROPIC_API_KEY` (OpenCode).
- Variables: `PROD_URL` (smoke tests, e.g. `https://retroboard.maoudia.com`), `OPENCODE_MODEL`
  (OpenCode model id, `provider/model`).
- Install the Claude GitHub App (`/install-github-app` in Claude Code) and, for OpenCode,
  `opencode github install`.

## Security

- Enabled: secret scanning, push protection, Dependabot alerts and security updates, private vulnerability
  reporting (Settings > Code security). Dependabot patch and minor updates merge by themselves when green
  (`.github/workflows/dependabot-automerge.yml`).

## Project board

- Create a GitHub Project (table or board), add a "Status" field, and enable the "Auto-add to
  project" workflow for `repo:maoudia/RetroBoard is:issue`. Existing issues are added once from
  the project with "Add items".
