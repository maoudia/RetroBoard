# Tasks

## 1. Tooling

- [x] 1.1 `Stryker disable` needs a named mutator and a reason, blocks need a restore, `all` is refused; verify `scripts/quality/test/stryker-disables.test.ts`
- [x] 1.2 `pnpm mutation:changed` mutation-tests the changed files and fails on a survivor, run by `pnpm prepush`; verify `scripts/quality/test/mutation-changed.test.ts`
- [x] 1.3 Pull request check in `checks.yml` that runs `pnpm mutation:changed --base origin/<base>` (enabled once the packages are at 100%, so it does not block every pull request meanwhile)

## 2. Kill the survivors, one package at a time (undetected on 2026-11-06)

- [x] 2.1 `sync` (17): 100%
- [x] 2.2 `protocol` (39): 100%
- [x] 2.3 `crypto` (54): 100%
- [x] 2.4 `exporters` (93): 100%
- [x] 2.5 `domain` (441): 100%
- [x] 2.6 `application` (790): 100%

## 3. Keep it at 100%

- [x] 3.1 Floors of 100 in `quality/mutation-baseline.json` and no tolerance in `scripts/quality/mutation-score.mjs`; verify a unit test of the ratchet with one survivor
- [x] 3.2 `docs/quality.md`: how to kill or waive a mutant, `pnpm mutation:changed`
