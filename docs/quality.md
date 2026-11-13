# Quality reports

Every commit on `main` runs `.github/workflows/quality.yml` (unit tests and the core e2e specs: the gate of Release and Deploy, about 6 minutes)
and then `.github/workflows/quality-reports.yml` (the slow tail: the rest of the e2e suite, mutation, the Allure report; it does not gate a release):

| Job (workflow) | What | Kept as |
|---|---|---|
| Unit tests and coverage (quality) | Vitest with v8 coverage and the coverage ratchets | Pages `coverage/`, `unit/results.json`; artifact `quality-unit` |
| Playwright core (chromium, 2 shards; quality) | The push gate: the specs of `tests/e2e/core.json` against `wrangler dev` | The Allure report; artifact `playwright-<project>-<n>` (HTML report, JSON, traces) |
| Playwright rest of the suite (chromium, 5 shards; reports) | Every spec outside the gate (`pnpm e2e:rest`), so Allure holds the whole suite once. Does not gate the run (`continue-on-error`); the nightly run repeats it on every browser | The Allure report; artifact `playwright-rest-<n>` |
| Mutation testing (reports) | Stryker on the pure packages, one full pass per package in parallel (6 shards), merged and compared with the floors by the ratchet job | Pages `mutation/` (one report per package); artifacts `mutation-shard-<package>`, `quality-mutation` |
| Allure report (unit + every e2e shard + mutation) | `allure-vitest` and `allure-playwright` write raw results when `ALLURE_RESULTS_DIR` is set; `allure generate` aggregates them with a history file kept on Pages; `scripts/quality/mutation-allure.mjs` turns the Stryker report into results (one per package, one failed result per undetected mutant) | Pages `allure/` (report and `history.jsonl`); artifacts `allure-results-*` |
| Image scan, signature, SBOM | On release: Trivy scan before the push, cosign signature, build provenance attestation, SBOM on the GitHub Release (`release.yml`) | Code scanning; release assets |
| Scorecard | OpenSSF Scorecard on main and weekly (`scorecard.yml`) | Code scanning; the OpenSSF API |
| Deploy | Gated production deploy with smoke test and automatic rollback, PR previews (`deploy.yml`, `preview.yml`, dormant until configured, `docs/runbooks/deploy.md`) | GitHub deployments |
| Publish (reports) | Deploys the Allure report as the GitHub Pages front page, with `coverage/` and `mutation/` beside it, even when a test job failed | https://maoudia.github.io/RetroBoard/ |

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

`release.yml` opens the release PR (version and changelog only) once Checks and Quality are green on main (Quality is the unit tests and the core e2e specs, the slow tail runs in `quality-reports.yml` and does not hold the release), then merges it
by itself. The PR is opened with the Actions token, so GitHub holds its own `pull_request` runs at `action_required` until
someone approves them; the workflow therefore dispatches the required checks on the release branch (Checks, E2E, Security,
ADR: about 5 minutes together) and deletes the held runs. No click, no second full suite. Mutants, Spec gate and
Dependency review always run and pass with nothing to do outside a pull request: a required check that is skipped is not a
result the merge box accepts.

The check runs of a dispatched run are not counted by the pull request, however green they are: on release PR 1.52.1 all 12
required contexts had a successful check run on the head commit, `gh pr checks --required` listed only CodeQL and the merge
state stayed BLOCKED (the ruleset's required-status-checks rule; no review, approval or other rule applies). A commit status
belongs to the commit, so once the dispatched runs finish the workflow copies each required context that the pull request
does not report as a check run onto the head commit as a status of the same name. The contexts are read from the ruleset
of main, the state is the real conclusion of the dispatched check run (success only for `success`), and a required context
that no dispatched run reports fails the step by name, so no check is dropped or invented.

Measured on 2026-11-13 (GitHub API, `run_started_at` to `updated_at`):

| Step | Before (releases 1.51.0 to 1.52.0) | Target |
|---|---|---|
| Release job (open PR, wait, merge, tag) | 38 min on 1.52.0; the checks it waits for take about 5 min, the rest was the held runs and then their second full run | about 6 min |
| Quality on main (gate of the release) | 17 to 48 min, median about 25 (it included mutation, the rest of the e2e suite and the Pages report) | about 6 min once the slow tail moved to `quality-reports.yml` |
| Nightly | 27 to 36 min when it passes | see the same change |

If the release PR still does not merge, the failed step of the release job prints the merge state and every check the pull
request sees. To unstick an open release PR, run `gh workflow run release.yml`: it dispatches the checks again,
copies their results and merges. If the held runs could not be deleted or the statuses do not unblock the merge, the
fallback is a GitHub App token for release-please (a secret only the owner can add): its pull request starts its own
`pull_request` runs and none of this is needed.

### Nightly timing (measured 2026-11-12 and 2026-11-13)

The nightly is 29 jobs of 9 to 19 minutes each (about 400 job-minutes in total) on a plan that runs 20 jobs at a time, so
a run takes the longest of: total work divided by 20 (about 20 minutes), and the slowest job plus the wait of the jobs
that started in a second wave. Last green nightly (run 43310995127): 30.4 minutes, of which the last 9 jobs waited up to
13.5 minutes in the queue. What was tried:

| Idea | Result | Decision |
|---|---|---|
| More shards | Each extra job adds about 35 s of checkout, install and build to the same test time, and the plan has no free slot for it: the queue grows | not adopted |
| Caching | Checkout, pnpm, Node setup (with the pnpm cache), install and `pnpm generate` take 35 to 40 s of an 850 s job (under 5%, the rule is 20%): the e2e step is over 90% of every job | not adopted |
| Two Playwright workers per job (`E2E_WORKERS=2`), 20 jobs in one wave | Total work 319 job-minutes instead of 400, but the wall time was 27.3 minutes (WebKit shards of 6 ran 20 to 27 minutes), and two parallel workers load the runner and the dev server | not adopted, flakiness risk for the nightly gate |
| Longest jobs first in the matrix (WebKit, then Firefox) | A matrix starts its jobs in the order listed: slow jobs last made the second wave wait for them. Free, no loss of checks. The one run on a branch was queued behind another nightly (41 minutes, 24 minutes of it queue), so the saving is not measured; the estimate is 30 to about 22 minutes | adopted, to be measured on the first scheduled nightly |

Further gains need less total work (fewer duplicated viewports on the same specs) or more concurrent runners, both
decisions for the owner.

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
