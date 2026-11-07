# Quality reports

Every commit on `main` runs `.github/workflows/quality.yml`:

| Job | What | Kept as |
|---|---|---|
| Unit tests and coverage | Vitest with v8 coverage and the coverage ratchets | Pages `coverage/`, `unit/results.json`; artifact `quality-unit` |
| Playwright core (chromium, 2 shards) | The push gate: the specs of `tests/e2e/core.json` against `wrangler dev` | The Allure report; artifact `playwright-<project>-<n>` (HTML report, JSON, traces) |
| Playwright rest of the suite (chromium, 5 shards) | Every spec outside the gate (`pnpm e2e:rest`), so Allure holds the whole suite once. Does not gate the run (`continue-on-error`); the nightly run repeats it on every browser | The Allure report; artifact `playwright-rest-<n>` |
| Mutation testing | Stryker on the pure packages, one full pass per package in parallel (6 shards), merged and compared with the floors by the ratchet job | Pages `mutation/` (one report per package); artifacts `mutation-shard-<package>`, `quality-mutation` |
| Allure report (unit + every e2e shard) | `allure-vitest` and `allure-playwright` write raw results when `ALLURE_RESULTS_DIR` is set; `allure generate` aggregates them with a history file kept on Pages | Pages `allure/` (report and `history.jsonl`); artifacts `allure-results-*` |
| Publish | Deploys the Allure report as the GitHub Pages front page, with `coverage/` and `mutation/` beside it, even when a test job failed | https://maoudia.github.io/RetroBoard/ |

Artifacts are kept 30 days. The site keeps the last report only; the trends come from the Allure history file
(`history.jsonl`, the last 20 runs, published at the site root).

## Mutation ratchet

The floors in `quality/mutation-baseline.json` are 100 for every package (change `mutation-score-100`): a mutant that
no test notices fails the build. `scripts/quality/mutation-score.mjs` reads `reports/mutation/mutation.json` and fails
the job when a score is below its floor or lower than the previous main run (read from the published
`mutation/summary.json`). There is no tolerance. Never lower a floor to make a build pass.

### A mutant survived

Run `pnpm mutation:changed` (also part of `pnpm prepush`): it mutation-tests the files you changed and lists the
survivors with the line and the replacement. Then, in this order:

1. **Kill it.** Add a test that fails with the mutation: assert the exact value, the boundary (`>=` against `>`), the
   order of a sort in any input order, the exact object a command sends.
2. **Simplify the code** when the mutant shows a guard or a default nothing needs (a branch the next line already
   covers, a fallback that cannot be reached). Dead code is the most common cause of a survivor.
3. **Waive it** only when the mutant is equivalent (it cannot change any behaviour): put
   `// Stryker disable next-line <Mutator>: <reason>` above the line, with the named mutator (never `all`) and a
   reason of a few words that says why no test can tell the difference. Blocks need a matching
   `// Stryker restore <Mutator>`. `scripts/quality/stryker-disables.mjs` (unit tested, run by `pnpm verify`)
   refuses a waiver without a mutator or a reason.

CI runs a full pass (`--force`) on every main commit: a restored incremental cache kept survivors that
new tests already kill, and the floors are 100. Locally the cache (`reports/stryker-incremental.json`) makes `pnpm mutation`
faster, but delete it when a result looks stale after you changed a test.

## Run locally

```bash
pnpm test:coverage                 # coverage/index.html
pnpm generate && pnpm e2e          # playwright-report/ (CI=1 adds JSON, JUnit, videos)
pnpm mutation                      # reports/mutation/index.html
pnpm mutation:changed              # only the files you changed; fails on a survivor
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
