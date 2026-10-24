# Tasks

## 1. Fast PR gates

- [ ] 1.1 Split CI into `pr.yml` (openspec validate, lint, typecheck, unit with per-package coverage thresholds, dependency-cruiser); verify a PR with a layer violation fails and a clean PR passes in under 10 minutes
- [ ] 1.2 Add the spec gate job (PR body `Change: <name>` or `no-spec` label); verify with two test PRs
- [ ] 1.3 Pin all actions by SHA, set minimal `permissions`, add Dependabot for actions; verify `actionlint` and `zizmor` (or equivalent) pass

## 2. End-to-end and quality

- [ ] 2.1 Shard Playwright across Chromium, Firefox, WebKit and four viewports (360, 768, 1440, 2560); verify the matrix runs green on main
- [ ] 2.2 Add visual regression on 12 key screens x 2 variants x 3 locales (fr, en, pseudo) with a label-driven baseline update workflow; verify a deliberate CSS change produces a diff artifact
- [ ] 2.3 Add axe a11y checks on every page and Lighthouse CI + size-limit budgets; verify budgets fail when exceeded
- [ ] 2.4 Add Stryker mutation testing on `packages/domain` (changed files on PR, full nightly) with a 70% break threshold; verify the report artifact

## 3. Security and supply chain

- [ ] 3.1 Add CodeQL, dependency review, OSV scanner, gitleaks and a license allow-list; verify each job runs and reports
- [ ] 3.2 Generate a CycloneDX SBOM on release and attach it; verify the release has the SBOM asset
- [ ] 3.3 Add a test that fails if `apps/relay` references Durable Object storage APIs; verify by adding a temporary `ctx.storage` call

## 4. Preview, release, production

- [ ] 4.1 Upload a Worker preview version per PR and comment its URL; verify on a test PR
- [ ] 4.2 Add release-please with Conventional Commits and a changelog; verify a release PR is created after a `feat:` commit
- [ ] 4.3 Add production smoke tests after deploy (health, landing, create and join a board) with rollback instructions in docs/runbooks/deploy.md; verify by running the job manually

## 5. Agentic workflows

- [ ] 5.1 Add issue forms (Agent task, Bug, Idea) and labels (`agent:ready`, `agent:claude`, `agent:opencode`, `needs:human`, `layer:*`, `size:*`, `epic:*`); verify forms render on GitHub
- [ ] 5.2 Add `agent-implement` for Claude Code (`anthropics/claude-code-action@v1`, prompt `/opsx:apply`) and OpenCode (`anomalyco/opencode/github@latest`) with guardrails; verify on a sandbox issue that a PR is opened and CI runs on it
- [ ] 5.3 Add `agent-review` (code-review plugin, inline comments) and `agent-mention`; verify on a test PR
- [ ] 5.4 Add nightly `agent-triage` and weekly `agent-docs` (automation mode, read-only tools plus issue creation); verify one manual run creates a summary issue
- [ ] 5.5 Add CODEOWNERS protecting `.github/**`, `openspec/config.yaml`, `apps/relay/**`; document branch protection and merge queue in docs/runbooks/repo-settings.md; verify an agent PR touching workflows is blocked
