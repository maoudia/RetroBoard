# Design

## Context

Today: one `ci.yml` (lint, typecheck, unit, generate, dry run, e2e Chromium, deploy if secrets). Workers Builds deploys `main`. Repository is public, so GitHub-hosted runners are free for standard runners.

## Goals / Non-Goals

**Goals:** every merged PR is releasable; agents get fast, precise feedback; humans review intent, not formatting.

**Non-Goals:** 100% automated merges; deploying from agent workflows.

## Decisions

- **Workflow split**: `pr.yml` (fast gates < 10 min: spec, static, unit, arch), `e2e.yml` (sharded matrix), `quality.yml` (visual, a11y, Lighthouse, size), `security.yml` (CodeQL, OSV, gitleaks, dependency review), `release.yml`, `nightly.yml` (full mutation, full e2e, triage agent). Required checks: pr + e2e + quality.
- **Pin actions by commit SHA** with Dependabot updating them; `permissions:` minimal per job; `persist-credentials: false` on checkout.
- **Visual regression** with Playwright `toHaveScreenshot` on Linux only (stable fonts), baselines committed, update through a labelled workflow (`visual:update`).
- **Agents**: `anthropics/claude-code-action@v1` (interactive on `@claude`, automation with `prompt: "/opsx:apply <change>"`), `anomalyco/opencode/github@latest` for OpenCode (`/oc`). Guardrails: `--max-turns 40`, 45 min timeout, concurrency group per issue, `allowed tools` limited to repo edits, tests and gh pr create; agents may not edit `.github/workflows/**` (CODEOWNERS + path check job).
- **Spec gate**: a job reads the PR body for `Change: <name>` and runs `openspec validate <name> --strict`; PRs without a change need the `no-spec` label (docs, deps).
- **Preview**: `wrangler versions upload --preview-alias pr-<n>` then comment the URL (exact flags to confirm with the installed Wrangler).

## Risks / Trade-offs

- [Flaky e2e block agents] -> retries 1 in CI, flaky test quarantine label, triage agent reports flakes nightly.
- [Agent cost] -> runs only on maintainers' labels or mentions; max turns and timeouts; subscription token.
- [Visual baselines churn] -> limited to 12 key screens; diffs uploaded as artifacts.

## Migration Plan

Introduce workflows one by one behind `workflow_dispatch`, then make them required in branch protection. Rollback: disable the workflow.

## Implementation notes (2026-10-24)

- Workflows: `checks.yml` (verify, build, spec gate, workflow lint), `e2e.yml` (matrix),
  `security.yml` (CodeQL, dependency review, OSV), `release.yml`, `smoke.yml`, `nightly.yml`
  (mutation), `claude.yml`, `agent-review.yml`, `opencode.yml`. All actions pinned by SHA,
  permissions per job, actionlint and zizmor clean.
- E2E matrix: only Chromium is required. Firefox, WebKit, phone and TV run with
  `continue-on-error` until `responsive-and-i18n-hardening` lands (task 2.1 stays open).
- Mutation testing break threshold starts at 55 (measured baseline about 54-60% without template
  data), to be raised toward 70 as reducer tests improve.
- Secret scanning: GitHub secret scanning and push protection (repository setting) instead of the
  gitleaks action, which needs a paid licence for organisation repositories.
- Lighthouse budgets (2.3) and the SBOM (3.2) are not done yet; the bundle budget uses
  `scripts/check-bundle-size.mjs` and accessibility uses axe in the e2e suite.
- Agent workflows skip themselves until `CLAUDE_CODE_OAUTH_TOKEN` (Claude) or `ANTHROPIC_API_KEY`
  plus the `OPENCODE_MODEL` variable (OpenCode) exist; live verification on a sandbox issue is
  pending those secrets.
- The relay "no storage API" guard (3.3) lands with `stateless-relay-and-replication`, since the
  current relay still uses SQLite storage.
