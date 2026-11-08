# Proposal

## Why

Test results are spread over several reports (Vitest JSON, one Playwright HTML report per project and shard, Stryker). The owner wants one aggregated test report, published on GitHub, using Allure (https://allurereport.org/modules/): one place to see every unit and end-to-end test of a commit, failures with traces, history, and flaky tests.

## What Changes

- **Raw results.** The unit tests (`allure-vitest`) and every Playwright shard (`allure-playwright`) write Allure results when `ALLURE_RESULTS_DIR` is set (CI only, off locally and in Stryker runs).
- **Aggregation.** The `pages` job of `quality.yml` downloads all raw results, runs `allure generate` (Allure 3) once, and keeps the run history (`history.jsonl`) between runs by reading it from, and publishing it to, GitHub Pages.
- **Publication.** The Allure report is the GitHub Pages front page, `https://maoudia.github.io/RetroBoard/` (owner decision 2026-11-06: use Allure instead of the hand-built quality page). Coverage (`/coverage/`) and the Stryker report (`/mutation/`, read by the mutation ratchet) stay next to it. `/allure/` redirects to the root so earlier links work.
- **Removed.** The hand-built index, its trend sparklines, `summary.json`, `history.json` and the per-project Playwright HTML copies on Pages: Allure shows results, failures with traces, history and flaky tests. The Playwright HTML report stays a CI artifact.
- **History size.** The history file keeps 20 runs (it was 50 and grew to 49 MB, downloaded and republished by every run).
- Licences checked: allure 3.22.1, allure-playwright 3.14.0, allure-vitest 3.14.0, all Apache-2.0 (permissive). Dev dependencies only: no change to the shipped bundle, CSP or runtime.

## Out of scope

- Allure on the nightly workflow (browsers firefox, webkit, phone, tv): a follow-up once the push gate report is validated.
- Allure TestOps or any paid service. Zero infrastructure cost: the report is static files on GitHub Pages.
- Replacing the mutation (Stryker) and coverage reports: Allure does not cover them.

## Bounded contexts

None (delivery tooling). No relay traffic.

## Capabilities

### New Capabilities

- `quality-reporting`: one aggregated test report per main commit, with history.

## Impact

- `package.json` (3 dev dependencies), `allurerc.mjs`, `playwright.config.ts`, `vitest.config.ts`, `.github/workflows/quality.yml` (explicitly requested by the owner), `scripts/quality/build-site.mjs`, `docs/quality.md`.
