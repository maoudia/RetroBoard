# Design

## Context

Today: `app/` (Nuxt), `shared/domain` (pure reducer, schemas, templates), `worker/` (Worker + Durable Object). npm, single package.json. See proposal.md - Why.

## Goals / Non-Goals

**Goals:** package boundaries that match layers; one command (`pnpm verify`) for the full local gate; incremental moves that keep the app releasable after each task group.

**Non-Goals:** rewriting logic, changing the wire protocol, new features.

## Decisions

- **pnpm workspaces** over npm workspaces (Turborepo was planned, then dropped during implementation: `pnpm -r` is enough for ten packages without a build step; add it if CI exceeds 10 minutes): strict node_modules (no phantom deps), fast local cache, filters (`--filter web`). Nx rejected: heavier, more config for a small team.
- **Package per layer, folders per bounded context** inside `domain` and `application`: avoids 20 tiny packages while keeping the layer rule enforceable.
- **dependency-cruiser** rules: `domain` imports nothing outside itself (and no `node:`, `vue`, `nuxt`, `cloudflare:`), `application` imports only `domain`, apps import anything. Rule violations fail CI.
- **Ports** declared in `packages/application/ports`: `RelayPort`, `ClockPort`, `IdPort`, `ReplicaStorePort` (stub for now), `ClipboardPort`, `FilePort`, `NotifierPort`. Adapters live in apps.
- **Use cases** are plain functions `(deps) => (input) => Result`, no classes required; return `Result<T, DomainError>`.
- Nuxt keeps auto-imports for components only; composables and stores import use cases explicitly (agents can follow imports).
- Where each type lives: aggregates/value objects/events in `packages/domain/<context>`; commands and read models in `packages/application/<context>`; valibot wire schemas in `packages/protocol`.

## Risks / Trade-offs

- [Big diff, merge conflicts with parallel work] -> do this change first, alone (lane A, P0), in 5 small PRs.
- [Workers Builds detects pnpm differently] -> keep `npm run generate` working through a root script until the build command is switched; verify a preview deploy before switching.
- [Nuxt and pnpm hoisting issues] -> `.npmrc` `shamefully-hoist=false`, add explicit deps where Nuxt needs them.

## Migration Plan

1. Add workspace tooling and move `worker/` to `apps/relay` (no logic change).
2. Move `shared/domain` to `packages/domain`, update imports, keep tests green.
3. Move `app/` to `apps/web`; extract `themes`, `i18n`, `exporters` packages.
4. Introduce application ports and use cases; refactor stores.
5. Add dependency-cruiser, `verify`, update CI and Workers Builds commands.
Rollback: each step is a separate PR; revert the PR.
