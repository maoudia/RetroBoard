# Tasks

## 1. Measure

- [ ] 1.1 Per-step durations of every main-branch job for 10 runs, published in docs/quality.md; verify the table
- [ ] 1.2 Spike: tsgo (TypeScript 7) for packages and a native Vue checker, Oxlint for covered rules; record speed and missed errors on fixtures; verify the spike note with sources

## 2. Adopt (maintainer approval required for workflow edits)

- [ ] 2.1 E2E: one build artifact for the matrix, Chromium sharding, affected-spec selection on PRs; verify durations before and after
- [ ] 2.2 Adopt the spike results that save >= 20% per job; verify durations before and after and an unchanged error set
