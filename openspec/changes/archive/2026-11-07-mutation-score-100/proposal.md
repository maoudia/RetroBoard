# Proposal

## Why

Owner decision 2026-11-06: "100% to be sure our work has no mutant". The mutation ratchet only stops regressions (floors 73 to 86%, 1,434 mutants undetected on 2026-11-06: application 790, domain 441, exporters 93, crypto 54, protocol 39, sync 17). A surviving mutant is a change in behaviour that no test notices, so only a package at 100% proves that its tests would catch a wrong edit. The goal is 100% now, and a gate that keeps it there.

## What Changes

- **Kill every killable mutant.** Tests for the survivors of each mutated package (`domain`, `application`, `protocol`, `crypto`, `exporters`, `sync`), one task group and one commit per package.
- **Waive only what no test can tell apart.** An equivalent mutant, or plain data such as a word list, is waived with `// Stryker disable next-line <Mutator>: <reason>` (or a named block with a matching restore). `all` is refused, every waiver needs a written reason, and a unit test enforces it.
- **Keep it at 100%.** `pnpm mutation:changed` mutation-tests the files changed against the base and fails on any survivor; `pnpm prepush` runs it and a pull request check runs it too. When the packages reach 100%, the floors in `quality/mutation-baseline.json` become 100 with no tolerance, so the main-branch ratchet fails on any survivor.
- **See it in the report.** Stryker has no Allure adapter, so a script converts its report into Allure results (one per package, one failed result per surviving mutant with its diff): task 3.4 of `allure-report-aggregation`.

## Out of scope

- Mutating `apps/web` and `apps/relay` (not in `stryker.config.json`; their logic that matters lives in the packages, and the Nuxt components are covered by e2e).
- Raising the unit-test coverage thresholds (they follow from the mutation work).

## Bounded contexts

None (delivery tooling and tests). No product behaviour changes, except where a surviving mutant reveals a real bug: those are fixed in the same commit with a regression test, and named in its message.

## Capabilities

### New Capabilities

- `mutation-testing`: every mutant of the pure packages is detected or waived with a reason.

## Impact

`packages/*/test`, `quality/mutation-baseline.json`, `scripts/quality` (already: `stryker-disables.mjs`, `mutation-changed.mjs`), `.github/workflows/checks.yml` (pull request check, requested by the owner), `docs/quality.md`.
