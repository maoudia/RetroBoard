# Tasks

## 1. Measure

- [ ] 1.1 Per-step durations of every main-branch job for 10 runs, published in docs/quality.md; verify the table
- [ ] 1.2 Spike: tsgo (TypeScript 7) for packages and a native Vue checker, Oxlint for covered rules; record speed and missed errors on fixtures; verify the spike note with sources

## 2. Adopt (maintainer approval required for workflow edits)

- [ ] 2.1 E2E: one build artifact for the matrix, Chromium sharding, affected-spec selection on PRs; verify durations before and after
- [ ] 2.2 Adopt the spike results that save >= 20% per job; verify durations before and after and an unchanged error set

## 3. Release path (target: a clean release in about 45 min; today main Quality about 25-48 + release job 38 + nightly 27-36)

- [ ] 3.1 Release PR: dispatched required checks only, held `pull_request` runs deleted, required checks never skipped (workflow edits, owner merges); verify on the next release: no click, release job under 10 min
- [ ] 3.2 Quality on main off the release gate: quality.yml keeps unit and the core e2e (the gate), quality-reports.yml runs the rest of the e2e suite, mutation and the Pages report after it, reading the Quality artifacts (workflow edits, owner merges); verify the lead time before and after
- [ ] 3.3 Cross-browser: more Firefox and WebKit shards on the nightly, a shared build artifact and package caches; verify the nightly duration before and after
