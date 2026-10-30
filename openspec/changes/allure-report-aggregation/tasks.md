# Tasks

## 1. Reporters and aggregation

- [x] 1.1 Add allure, allure-playwright and allure-vitest (Apache-2.0), `allurerc.mjs`, reporters gated on `ALLURE_RESULTS_DIR`; verify locally: unit results and a Playwright sample aggregate into one report with history
- [x] 1.2 `quality.yml`: raw results as artifacts from the unit job and every e2e shard, aggregation with history in the pages job, link on the quality index; actionlint and zizmor clean
- [ ] 1.3 Verify on the first real run of main: the report is published at `/allure/`, the second run shows history and trends

## 2. Documentation

- [x] 2.1 `docs/quality.md`: where the report lives, how to generate it locally, how history works
