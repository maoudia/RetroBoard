# Proposal

## Why

Test results are spread over several reports (Vitest JSON, one Playwright HTML report per project and shard, Stryker). The owner wants one aggregated test report, published on GitHub, using Allure (https://allurereport.org/modules/): one place to see every unit and end-to-end test of a commit, failures with traces, history, and flaky tests.

## What Changes

- **Raw results.** The unit tests (`allure-vitest`) and every Playwright shard (`allure-playwright`) write Allure results when `ALLURE_RESULTS_DIR` is set (CI only, off locally and in Stryker runs).
- **Aggregation.** The `pages` job of `quality.yml` downloads all raw results, runs `allure generate` (Allure 3) once, and keeps the run history (`history.jsonl`) between runs by reading it from, and publishing it to, GitHub Pages.
- **Publication.** The report is published at `https://maoudia.github.io/RetroBoard/allure/` and linked from the quality index. The existing Playwright HTML and coverage reports stay.
- Licences checked: allure 3.22.1, allure-playwright 3.14.0, allure-vitest 3.14.0, all Apache-2.0 (permissive). Dev dependencies only: no change to the shipped bundle, CSP or runtime.

## Out of scope

- Allure on the nightly workflow (browsers firefox, webkit, phone, tv): a follow-up once the push gate report is validated.
- Allure TestOps or any paid service. Zero infrastructure cost: the report is static files on GitHub Pages.
- Replacing the Playwright HTML report or the mutation report.

## Bounded contexts

None (delivery tooling). No relay traffic.

## Capabilities

### New Capabilities

- `quality-reporting`: one aggregated test report per main commit, with history.

## Impact

- `package.json` (3 dev dependencies), `allurerc.mjs`, `playwright.config.ts`, `vitest.config.ts`, `.github/workflows/quality.yml` (explicitly requested by the owner), `scripts/quality/build-site.mjs`, `docs/quality.md`.
