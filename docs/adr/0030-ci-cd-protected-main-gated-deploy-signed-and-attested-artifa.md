---
status: accepted
date: 2026-11-07
decision-makers: Moncef Aoudia
---

# CI/CD: protected main, gated deploy, signed and attested artifacts

## Context and Problem Statement

The pipeline built up change by change: checks on every push, a full quality run on main, automatic releases (ADR-0025) and
a container image. Production, however, deployed on every push through the Cloudflare Workers Builds Git integration,
whatever the result of the checks. Main accepted direct pushes with no required check, the container image was not
signed, mutation testing took longer than one runner allows, and the nightly browser matrix failed on flaky specs.
What should a reference-quality pipeline for this project look like, within ADR-0018 (no paid service, no vendor lock-in)?

## Decision Drivers

* A red commit must never reach production, and a regression must never reach main.
* Every artifact must be verifiable by whoever runs it (provenance, signature, SBOM).
* A failure must mean something: no flaky test hides behind a retry, no stale cache keeps a result.
* Feedback in minutes, not a quarter of an hour; a full pass inside the runner limits.
* No secret created or held by the project tooling: the maintainer owns the Cloudflare credentials.

## Considered Options

* Keep the current pipeline and add checks as needed.
* Deploy from GitHub Actions after a green gate, protect main, sign and attest the image.
* Move to another CI or host.

## Decision Outcome

Chosen option: "Deploy from GitHub Actions after a green gate, protect main, sign and attest the image", because it
closes every gap with the tools already in use and costs nothing.

* **Protected main.** A ruleset requires a pull request and the checks `Specs, lint, types, architecture, unit`,
  `Static build, bundle budget, Worker dry run`, `Workflow lint (actionlint, zizmor)`, `Conventional Commits`,
  `Playwright (chromium 1/2)` and `(2/2)`, `CodeQL` and `Mutants of the changed files`; rebase merge for agent pull requests (squash for the release and Dependabot bots), no force push.
  Pull requests merge by themselves when green (auto-merge). Dependabot updates that are green merge by themselves for
  patch and minor versions.
* **Mutation floors of 100.** A full pass per package, the two biggest split into shards balanced by file size and
  merged, with no incremental cache; a missing shard fails the ratchet (change `mutation-score-100`).
* **Gated deploy.** `deploy.yml` deploys the commit of a successful main run only if Checks and Quality are green for
  it, smoke tests production and rolls the Worker back when the smoke test fails. `preview.yml` uploads a preview version
  per pull request. Both stay dormant until the maintainer sets the variable `CLOUDFLARE_DEPLOY` and the Cloudflare
  secrets, and turns the Workers Builds Git integration off.
* **Signed and attested image.** The image is scanned (Trivy, fixable critical and high findings stop the release) before it is
  pushed, signed with cosign (keyless), attested with build provenance, and shipped with an SBOM attached to the release.
* **Scorecard.** OpenSSF Scorecard runs weekly and on main; its findings go to code scanning.
* **Reliability.** Accessibility checks measure settled frames (`axe()` in `tests/e2e/helpers.ts`), specs that cannot
  run on a device skip with a reason, slow WebKit gets longer timeouts, and nothing is retried silently beyond one retry.

### Consequences

* Good, because main is always releasable and production only receives green commits.
* Good, because anyone can verify the image (`gh attestation verify`, `cosign verify`) and read its SBOM.
* Good, because the quality run finishes in about 10 minutes instead of failing at 45.
* Bad, because every change now goes through a pull request and its checks (minutes), even a one-line fix.
* Bad, because the deploy and preview workflows do nothing until the maintainer adds the Cloudflare credentials.
* Bad, because the image scan can stop a release for a vulnerability in the base image; the fix is a new base image.

## More Information

* ADR-0001 (Cloudflare Workers), ADR-0018 (no paid service), ADR-0025 (automatic releases).
* `docs/runbooks/deploy.md`, `docs/runbooks/repo-settings.md`, `docs/quality.md`.
* Revisit when the project gets a second maintainer (add required reviews) or leaves Cloudflare.
