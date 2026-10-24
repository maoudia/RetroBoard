# Proposal

## Why

The product will be built largely by agents (Claude Code, OpenCode) working from OpenSpec changes and GitHub issues. Agents are only as safe as the gates around them. We need a CI/CD harness that catches regressions humans would miss at review time (visual, a11y, protocol, layer, mutation, security) and workflows that let agents pick up ready issues, implement one task group, and open a reviewable PR. Everything must stay free on a public repository.

## What Changes

- PR pipeline with the gates listed in docs/PLAN.md 10.1 (spec gate, static, unit + coverage, mutation on domain, protocol compatibility, e2e matrix across browsers and viewports, visual regression per theme x variant x locale, axe a11y, Lighthouse and bundle budgets, security and supply-chain checks).
- Preview deployment per PR with the URL commented on the PR.
- Release automation (Conventional Commits, release-please), production smoke tests and rollback.
- Agentic workflows: `agent-implement` (label driven, Claude Code or OpenCode, `/opsx:apply`), `agent-review`, `agent-mention`, nightly `agent-triage`, weekly `agent-docs`.
- Issue forms for "Agent task" and "Bug", labels, CODEOWNERS, branch protection and merge queue settings documented.

Out of scope: paid runners, paid SaaS quality tools, auto-merge without human review.

## Capabilities

### New Capabilities

None. Tooling only, `skip_specs: true`.

### Modified Capabilities

None.

## Impact

- `.github/workflows/*`, `.github/ISSUE_TEMPLATE/*`, `tooling/*`, `AGENTS.md`, `CLAUDE.md`.
- Secrets needed: `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` (agents), Cloudflare token only if deploying from Actions (Workers Builds already deploys).
- Free-plan budget: preview versions share the production Worker quota; e2e runs locally in CI, not against production.
