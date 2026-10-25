# Proposal

## Why

The owner asked whether the Nuxt/TypeScript toolchain slows CI/CD. Measured locally on 2026-10-25: generate 8 s (Nuxt 4.6 already builds with Vite 8 and Rolldown), lint 8 s, unit tests 9 s, knip 2 s, architecture 2 s, typecheck 41 s. In CI the long poles are the end-to-end matrix (Playwright on several browsers) and mutation testing, not the framework build. The work is to cut those, and typechecking, with measurements before and after.

## What Changes

- Measure every CI job (duration per step, cache hit rates) and publish the table in docs/quality.md.
- Typecheck: try the native TypeScript compiler (tsgo, TypeScript 7) for packages and a native Vue checker if stable; keep vue-tsc where needed.
- Lint: try Oxlint for the rules it covers (type-aware linting is stable per its authors) with ESLint kept for Vue templates and custom rules.
- E2E: build the site once and share the artifact across the matrix, shard Chromium, reuse the wrangler dev server per shard, run only affected specs on PRs (full matrix on main).
- Mutation: keep incremental mode, run per package in parallel jobs.
- Adopt only changes that save at least 20% of a job without losing checks.

Out of scope: replacing Nuxt or Vue.

Bounded contexts: none (delivery tooling). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform-security`: none in behaviour; CI timings are documented (no spec delta needed beyond the budget requirement below).

## Impact

- .github/workflows (maintainer approval required), package scripts, docs/quality.md.
