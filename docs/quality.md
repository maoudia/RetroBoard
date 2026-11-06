# Quality reports

Every commit on `main` runs `.github/workflows/quality.yml`:

| Job | What | Kept as |
|---|---|---|
| Unit tests and coverage | Vitest with v8 coverage and the coverage ratchets | Pages `coverage/`, `unit/results.json`; artifact `quality-unit` |
| Playwright core (chromium, 2 shards) | The push gate: the specs of `tests/e2e/core.json` against `wrangler dev` | The Allure report; artifact `playwright-<project>-<n>` (HTML report, JSON, traces) |
| Playwright rest of the suite (chromium, 5 shards) | Every spec outside the gate (`pnpm e2e:rest`), so Allure holds the whole suite once. Does not gate the run (`continue-on-error`); the nightly run repeats it on every browser | The Allure report; artifact `playwright-rest-<n>` |
| Mutation testing | Stryker on the pure packages (domain, application, protocol, crypto, exporters), incremental | Pages `mutation/`; artifact `quality-mutation` |
| Allure report (unit + every e2e shard) | `allure-vitest` and `allure-playwright` write raw results when `ALLURE_RESULTS_DIR` is set; `allure generate` aggregates them with a history file kept on Pages | Pages `allure/` (report and `history.jsonl`); artifacts `allure-results-*` |
| Publish | Deploys the Allure report as the GitHub Pages front page, with `coverage/` and `mutation/` beside it, even when a test job failed | https://maoudia.github.io/RetroBoard/ |

Artifacts are kept 30 days. The site keeps the last report only; the trends come from the Allure history file
(`history.jsonl`, the last 20 runs, published at the site root).

## Mutation ratchet

`scripts/quality/mutation-score.mjs` reads `reports/mutation/mutation.json` and fails the job when:

- the overall score or a package score drops more than 0.5 point below the previous main run
  (read from the published `mutation/summary.json`), or
- a score is below its floor in `quality/mutation-baseline.json`.

Raise the floor when the job prints the "well above the floor" notice. Never lower it to make a
build pass: kill the surviving mutants instead (the HTML report lists them).

The incremental cache (`reports/stryker-incremental.json`) is restored from the previous run, so a
commit only re-tests the mutants its changes touch. The nightly workflow runs a full pass with
`--force` to catch anything the cache could hide.

## Run locally

```bash
pnpm test:coverage                 # coverage/index.html
pnpm generate && pnpm e2e          # playwright-report/ (CI=1 adds JSON, JUnit, videos)
pnpm mutation                      # reports/mutation/index.html
node scripts/quality/mutation-score.mjs
```

## One-time setting

GitHub Pages must use **GitHub Actions** as its source: repository Settings > Pages > Build and
deployment > Source: GitHub Actions. Until then the publish job fails; the other jobs and the
artifacts are unaffected.

## Allure report

One aggregated report per main commit, the front page of https://maoudia.github.io/RetroBoard/ (`/allure/` redirects to it; change `allure-report-aggregation`, Allure 3, Apache-2.0). Coverage is at `/coverage/` and the Stryker report at `/mutation/`.
Locally: `ALLURE_RESULTS_DIR=allure-results/unit pnpm exec vitest run`, then `pnpm exec allure generate allure-results/unit --clean` and open `reports/allure/index.html`.
History is the `history.jsonl` file the previous run published next to the report; the `pages` job downloads it before generating and publishes the updated file. Nothing is stored outside GitHub Pages.
