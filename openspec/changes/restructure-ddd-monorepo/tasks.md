# Tasks

## 1. Workspace tooling

- [ ] 1.1 Add pnpm workspace (`pnpm-workspace.yaml`), Turborepo (`turbo.json`) and root scripts (`dev`, `build`, `test`, `lint`, `typecheck`, `verify`); verify `pnpm install && pnpm turbo run test` passes with the current code
- [ ] 1.2 Move `worker/` to `apps/relay` with its own package.json and tsconfig; verify `pnpm --filter relay typecheck` and the worker unit tests pass
- [ ] 1.3 Update `wrangler.jsonc` paths and CI to pnpm; verify `wrangler deploy --dry-run` succeeds from the root

## 2. Domain package

- [ ] 2.1 Create `packages/domain` and move `shared/domain` into context folders (`ideation`, `voting`, `action-tracking`, `facilitation`, `catalogue`); verify all reducer, snapshot and template tests pass from the new location
- [ ] 2.2 Create `packages/protocol` with the valibot command schemas and `parseCommand`; verify schema tests pass and `packages/domain` has no valibot import

## 3. Web app and data packages

- [ ] 3.1 Move `app/` to `apps/web` (Nuxt 4), keep static generation and CSP hash script; verify `pnpm --filter web generate` output matches today's routes and the e2e suite passes
- [ ] 3.2 Extract `packages/themes` (definitions, contrast test) and `packages/i18n` (dictionaries, translate, detect); verify their unit tests pass and the web app builds
- [ ] 3.3 Extract `packages/exporters` (Markdown, CSV, JSON) as pure functions over a read model; verify export unit tests (including CSV formula neutralisation) pass

## 4. Application layer

- [ ] 4.1 Create `packages/application` with ports (`RelayPort`, `ClockPort`, `IdPort`, `ClipboardPort`, `FilePort`, `NotifierPort`) and `Result` type; verify it compiles with no import outside `domain`
- [ ] 4.2 Implement use cases for existing behaviour (publish drafts, vote, group, columns, actions, timer, settings) with unit tests using `packages/testkit` fakes; verify coverage >= 90% for `application`
- [ ] 4.3 Refactor Pinia stores to call use cases and adapters wired in one composition-root plugin; verify the full e2e suite passes unchanged

## 5. Enforcement

- [ ] 5.1 Add dependency-cruiser config with the layer rules from docs/PLAN.md 3.1 and a forbidden-imports rule for `node:`, `vue`, `nuxt`, `cloudflare:` in `domain`; verify a deliberately wrong import fails `pnpm verify`
- [ ] 5.2 Add `knip` for unused files/exports and fix findings; verify `pnpm knip` exits 0
- [ ] 5.3 Update README, docs/ARCHITECTURE.md and AGENTS.md with the new layout; verify links resolve (markdown link check in CI)

## Workflow follow-up

- Switch the Workers Builds build command to `pnpm turbo run build --filter web` after 3.1 is merged.
