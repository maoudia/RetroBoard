# Tasks

## 1. Fast PR gates

- [x] 1.1 Split CI into `pr.yml` (openspec validate, lint, typecheck, unit with per-package coverage thresholds, dependency-cruiser); verify a PR with a layer violation fails and a clean PR passes in under 10 minutes
- [x] 1.2 Add the spec gate job (PR body `Change: <name>` or `no-spec` label); verify with two test PRs
- [x] 1.3 Pin all actions by SHA, set minimal `permissions`, add Dependabot for actions; verify `actionlint` and `zizmor` (or equivalent) pass

## 2. End-to-end and quality

- [ ] 2.1 Shard Playwright across Chromium, Firefox, WebKit and four viewports (360, 768, 1440, 2560); verify the matrix runs green on main (Status 2026-11-11: `nightly.yml` shards chromium, firefox, webkit, `phone` (Pixel 7) and `tv` (2560 x 1440), the `w360`, `w768` and `w1440` projects now join the nightly matrix; open until the whole matrix is green on main, the latest nightly runs being red. Status 2026-11-12: "green" is the nightly gate of `docs/roadmap.md`: two retries, WebKit excluded, a quarantine that only shrinks (`tests/e2e/quarantine.json`), counted by `pnpm nightly:streak`.)
- [x] 2.3 Add axe a11y checks on every page and size-limit budgets (Lighthouse moved to `quality-gates-v2` on 2026-10-29); verify budgets fail when exceeded (Status 2026-11-11: `pnpm size` (`scripts/check-bundle-size.mjs`, in `checks.yml`) exits 1 over budget, verified; `/check` is now audited by axe in light and dark in `tests/e2e/a11y.spec.ts`, 2026-11-11.)
- [x] 2.4 Add Stryker mutation testing on `packages/domain` (changed files on PR, full nightly) with a 70% break threshold; verify the report artifact

## 3. Security and supply chain

- [x] 3.1 Add CodeQL, dependency review, OSV scanner, gitleaks and a license allow-list; verify each job runs and reports
- [x] 3.2 Generate an SPDX SBOM on release and attach it; verify the release has the SBOM asset (Status 2026-11-11: SPDX accepted over CycloneDX; `release.yml` attaches `sbom.spdx.json`, present on the v1.51.3 release assets.)
- [x] 3.3 Add a test that fails if `apps/relay` references Durable Object storage APIs; verify by adding a temporary `ctx.storage` call

## 4. Preview, release, production

- [ ] 4.1 Upload a Worker preview version per PR and comment its URL; verify on a test PR (Status 2026-11-11: `preview.yml` uploads a version on every PR (green on PR 650), but the "Comment the preview URL" step is skipped and no PR carries the comment; wrangler prints a preview URL only when the Worker has Preview URLs enabled server side (`previews_enabled`), which `preview_urls: true` in `wrangler.jsonc` sets at the next production deploy; open until a PR carries the comment.)
- [x] 4.2 Add release-please with Conventional Commits and a changelog; verify a release PR is created after a `feat:` commit
- [x] 4.3 Add production smoke tests after deploy (health, landing, create and join a board) with rollback instructions in docs/runbooks/deploy.md; verify by running the job manually

## 5. Agentic workflows

- [x] 5.1 Add issue forms (Agent task, Bug, Idea) and labels (`agent:ready`, `agent:claude`, `agent:opencode`, `needs:human`, `layer:*`, `size:*`, `epic:*`); verify forms render on GitHub
- [x] 5.2 Add `agent-implement` for Claude Code (`anthropics/claude-code-action@v1`, prompt `/opsx:apply`) and OpenCode (`anomalyco/opencode/github@latest`) with guardrails; verify on a sandbox issue that a PR is opened and CI runs on it
- [x] 5.3 Add `agent-review` (code-review plugin, inline comments) and `agent-mention`; verify on a test PR
- [x] 5.5 Add CODEOWNERS protecting `.github/**`, `openspec/config.yaml`, `apps/relay/**`; document branch protection and merge queue in docs/runbooks/repo-settings.md; verify an agent PR touching workflows is blocked

## 6. Split out

- Task 2.2 (visual regression) moved to the change `visual-regression`, 2026-11-11.
- Task 5.4 (`agent-triage` and `agent-docs`) moved to the change `agent-maintenance`, 2026-11-11.
