# Proposal

## Why

The current code is a single Nuxt app with a `shared/` domain folder. Layer rules are conventions only, so agents and humans can (and will) import adapters into the domain. Every later epic adds bounded contexts; without enforced boundaries the code will rot. This change turns layers into packages and enforces the dependency rule before features are added (docs/PLAN.md sections 3 and 4).

## What Changes

- Convert the repository to a pnpm workspace with Turborepo: `apps/web`, `apps/relay`, `packages/domain`, `packages/application`, `packages/protocol`, `packages/themes`, `packages/i18n`, `packages/exporters`, `packages/testkit`, `tooling/eslint-config`.
- Move the existing domain (`shared/domain`) into `packages/domain`, split by bounded context folders (facilitation, ideation, voting, action-tracking).
- Introduce application use cases and ports for the behaviours that exist today; Pinia stores call use cases instead of `board.send`.
- Add architecture tests (`dependency-cruiser`) and a `verify` script that runs lint, types, unit, architecture tests and `openspec validate`.
- No user-visible behaviour change. All existing unit and e2e tests keep passing.

Out of scope: new features, the sync/encryption redesign (separate changes), changing the deployment target.

## Capabilities

### New Capabilities

None. Pure refactor, `skip_specs: true`.

### Modified Capabilities

None.

## Impact

- Bounded contexts: all (moved, not changed).
- Every import path changes; CI and Workers Builds commands change to pnpm/turbo.
- Free-plan budget: unchanged.
