# Tasks

## 1. Reporters and aggregation

- [x] 1.1 Add allure, allure-playwright and allure-vitest (Apache-2.0), `allurerc.mjs`, reporters gated on `ALLURE_RESULTS_DIR`; verify locally: unit results and a Playwright sample aggregate into one report with history
- [x] 1.2 `quality.yml`: raw results as artifacts from the unit job and every e2e shard, aggregation with history in the pages job, link on the quality index; actionlint and zizmor clean
- [x] 1.3 Verified on main (2026-11-06): the report was published at `/allure/` with a 50-run history file

## 2. Documentation

- [x] 2.1 `docs/quality.md`: where the report lives, how to generate it locally, how history works

## 3. Allure as the site front page (owner decision 2026-11-06)

- [x] 3.1 `build-site.mjs` publishes the Allure report as the Pages root with `coverage/` and `mutation/` beside it and a `/allure/` redirect; the hand-built index, sparklines, `summary.json`, `history.json` and per-project Playwright copies are gone; history file read from the root (falling back to the old `/allure/` path once) and limited to 20 runs; verify a unit test of the site layout
- [ ] 3.2 Verify on the next run of main: the front page is the Allure report, `/coverage/` and `/mutation/` answer, the second run shows the history
- [x] 3.3 The report holds the whole e2e suite, not only the push gate: `pnpm e2e:rest` (specs outside `core.json`) runs sharded and non-gating in Quality and writes Allure results; verify a unit test that core and rest cover every spec once
- [ ] 3.4 Convert the Stryker report into Allure results (one result per package, one failed result per surviving mutant with its diff) so mutation testing appears in the same report; verify a unit test of the conversion
