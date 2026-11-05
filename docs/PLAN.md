# RetroBoard - Plan

Status: reduced on 2026-11-05 (change stabilise-main, docs truth pass). Owner: Moncef Aoudia (MAIDAF EURL).
This is the entry point for humans and agents. It holds the vision and the non-negotiables only; everything that changes lives elsewhere, so nothing here goes stale.

## Where things live

| Question | Source of truth |
|---|---|
| Why was it decided like this? | [docs/adr](adr/README.md) (MADR 4.0, one file per decision) |
| What must the product do? | `openspec/specs/` (current behaviour) and `openspec/changes/<name>/` (work in progress) |
| What is planned, in which order? | [docs/roadmap.md](roadmap.md), generated from `openspec/changes` by `scripts/github/sync-issues.mjs`, and the GitHub project board |
| How is it built? | [docs/architecture.md](architecture.md) and the skill `retroboard-stack` |
| How do I work on it? | [AGENTS.md](../AGENTS.md), [CONTRIBUTING.md](../CONTRIBUTING.md), [docs/design-system.md](design-system.md) |
| Business model and risks | [docs/business-plan.md](business-plan.md) |

## 1. Product vision and non-negotiables

RetroBoard runs a complete team retrospective in one hour, from reviewing last sprint's actions to agreeing on new ones, on any screen from a phone to a meeting-room TV. It costs nothing to run and keeps nothing about the team.

Non-negotiables (also in `openspec/config.yaml`, so every agent sees them):

| # | Constraint | Consequence |
|---|---|---|
| N1 | 0 EUR infrastructure | Cloudflare Workers Free: static assets + one Durable Object class. No paid add-on is required for the product to work. |
| N2 | No storage on our side | The relay holds state in memory only and never calls Durable Object storage. Durable state lives in browsers (encrypted replicas) and in files people export. |
| N3 | End-to-end encryption | Content is encrypted in the browser. The key travels in the URL fragment (`#...`), which browsers never send to servers. |
| N4 | The board theme is respected | Facilitator picks the theme; participants can only switch its light or dark variant. |
| N5 | Maintainable by humans and agents | DDD + clean architecture, enforced by tests; OpenSpec for every behaviour change; small tasks with explicit verification. |
| N6 | Ethical business | Core retro features free forever. Paid tiers unlock scale and premium content, never basic needs. No ads, no tracking, no data resale. |
