---
status: accepted
date: 2026-10-29
decision-makers: Moncef Aoudia
---

# Automatic semantic releases from Conventional Commits, GitHub Release and GHCR image

## Context and Problem Statement

Releases depended on someone merging the release-please pull request, the commit format was not enforced, and a release carried no downloadable artifact. How do we get one SemVer version per release, cut without a manual step and only from a green main, with a changelog and an artifact people can run? Change: `automated-semver-release`.

## Decision Drivers

* Zero infrastructure cost and no vendor lock-in (ADR-0018): GitHub Actions, GitHub Releases and GHCR are free for a public repository.
* A red main must never be released (owner rule, 2026-10-26 incident).
* Hard constraints stay: no server-side storage, no plaintext board content outside the browser.
* Keep what already works: release-please manifest, `CHANGELOG.md`, tags up to v1.2.0.

## Considered Options

* Keep release-please and let the workflow merge its release PR once main is green
* semantic-release (no release PR, a version commit pushed to main)
* A custom script built on conventional-changelog

## Decision Outcome

Chosen option: "Keep release-please and let the workflow merge its release PR once main is green", because it reuses the existing manifest and history, keeps the changelog a reviewable file, adds no dependency and makes the gate explicit (the `Checks` and `Quality` runs of the main commit).

* One product version, SemVer, from Conventional Commits: `feat` minor, `fix` and `perf` patch, `!` or `BREAKING CHANGE` major. Workspace packages stay private and unversioned.
* Commit format is enforced by a local `commit-msg` hook and by CI on every push and pull request (commits and title).
* Each release publishes `ghcr.io/maoudia/retroboard` (`X.Y.Z`, `X.Y`, `X`, `latest`; linux/amd64 and linux/arm64; provenance and SBOM). The image runs the same Worker bundle with the local workerd runtime, memory only, for self-hosting.
* The Cloudflare deploy of main is unchanged.

### Consequences

* Good, because releases follow main without a manual step and never from a red main.
* Good, because users get a tagged GitHub Release with notes and a runnable image.
* Bad, because the release PR is merged with `GITHUB_TOKEN`, so no checks run on the release commit itself; it only changes the changelog, the version and the manifest.
* Bad, because a flaky `Quality` run delays a release until the next green run.
* Bad, because the image needs `wrangler` at runtime (about 200 MB) and a `SELF_HOSTED` flag to avoid the HTTPS redirect behind a TLS proxy.

## More Information

* release-please: <https://github.com/googleapis/release-please-action> (v5.0.0, pinned by SHA in the workflow)
* Conventional Commits 1.0.0: <https://www.conventionalcommits.org/en/v1.0.0/>
* Semantic Versioning 2.0.0: <https://semver.org/spec/v2.0.0.html>
* GHCR: <https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry>
* Revisit if the image is used in production by others (then consider a direct workerd configuration instead of `wrangler dev`) or if branch protection is added to main (the bot then needs a bypass).
