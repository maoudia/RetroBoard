# Quality reports

Every commit on `main` runs `.github/workflows/quality.yml`:

| Job | What | Kept as |
|---|---|---|
| Unit tests and coverage | Vitest with v8 coverage and the coverage ratchets | Pages `coverage/`, `unit/results.json`; artifact `quality-unit` |
| Playwright core (chromium, 2 shards) | The push gate: the specs of `tests/e2e/core.json` against `wrangler dev` | The Allure report; artifact `playwright-<project>-<n>` (HTML report, JSON, traces) |
| Playwright rest of the suite (chromium, 5 shards) | Every spec outside the gate (`pnpm e2e:rest`), so Allure holds the whole suite once. Does not gate the run (`continue-on-error`); the nightly run repeats it on every browser | The Allure report; artifact `playwright-rest-<n>` |
| Mutation testing | Stryker on the pure packages, one full pass per package in parallel (6 shards), merged and compared with the floors by the ratchet job | Pages `mutation/` (one report per package); artifacts `mutation-shard-<package>`, `quality-mutation` |
| Allure report (unit + every e2e shard + mutation) | `allure-vitest` and `allure-playwright` write raw results when `ALLURE_RESULTS_DIR` is set; `allure generate` aggregates them with a history file kept on Pages; `scripts/quality/mutation-allure.mjs` turns the Stryker report into results (one per package, one failed result per undetected mutant) | Pages `allure/` (report and `history.jsonl`); artifacts `allure-results-*` |
| Image scan, signature, SBOM | On release: Trivy scan before the push, cosign signature, build provenance attestation, SBOM on the GitHub Release (`release.yml`) | Code scanning; release assets |
| Scorecard | OpenSSF Scorecard on main and weekly (`scorecard.yml`) | Code scanning; the OpenSSF API |
| Deploy | Gated production deploy with smoke test and automatic rollback, PR previews (`deploy.yml`, `preview.yml`, dormant until configured, `docs/runbooks/deploy.md`) | GitHub deployments |
| Publish | Deploys the Allure report as the GitHub Pages front page, with `coverage/` and `mutation/` beside it, even when a test job failed | https://maoudia.github.io/RetroBoard/ |

Artifacts are kept 30 days. The site keeps the last report only; the trends come from the Allure history file
(`history.jsonl`, the last 20 runs, published at the site root).

## Nightly gate

The nightly run (`nightly.yml`) is the cross-browser gate of releases R1 and R2 (definition and dates: `docs/roadmap.md`, section
Nightly gate). In short: the nightly retries a failed test twice, WebKit reports but never gates, and a spec listed in
`tests/e2e/quarantine.json` runs and is reported but does not fail its job. The list only shrinks (`pnpm quarantine`, the ceiling
in `quality/quarantine-baseline.json`, part of `pnpm verify`). `pnpm nightly:streak -- --target=14` prints how many scheduled
nights in a row were green by that definition (needs the `gh` CLI). To take a spec out of quarantine: fix it, run it
nightly, delete its entry and lower the ceiling.

## Release path

`release.yml` opens the release PR (version and changelog only) once Checks and Quality are green on main, then merges it
by itself. The PR is opened with the Actions token, so GitHub holds its own `pull_request` runs at `action_required` until
someone approves them; the workflow therefore dispatches the required checks on the release branch (Checks, E2E, Security,
ADR: about 5 minutes together) and deletes the held runs. No click, no second full suite. Mutants, Spec gate and
Dependency review always run and pass with nothing to do outside a pull request: a required check that is skipped is not a
result the merge box accepts.

Measured on 2026-11-13 (GitHub API, `run_started_at` to `updated_at`):

| Step | Before (releases 1.51.0 to 1.52.0) | Target |
|---|---|---|
| Release job (open PR, wait, merge, tag) | 38 min on 1.52.0; the checks it waits for take about 5 min, the rest was the held runs and then their second full run | about 6 min |
| Quality on main (gate of the release) | 17 to 48 min, median about 25 | see `openspec/changes/ci-toolchain-speed` |
| Nightly | 27 to 36 min when it passes | see the same change |

If the release PR still does not merge, the failed step of the release job prints the merge state and the checks that are
not green. If it says the held runs could not be deleted, the fallback is a GitHub App token for release-please (a
secret only the owner can add).

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
