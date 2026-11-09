# Proposal

## Why

The OpenSSF Scorecard of `github.com/maoudia/RetroBoard` is 7.3 (report of 2026-11-08, commit 7c13b33, Scorecard v5.6.0). Owner request: "create an open spec to fix this". The score is a public, third-party reading of the supply-chain promises the project already makes (ADR-0030), so each lost point is either a real gap or a measurement we can fix. The report splits as follows.

| Check | Score | Cause | Action |
|---|---|---|---|
| Code-Review | 0 | 0 of 30 changesets approved: the ruleset needs no approval | Require one approval, given by an independent automated reviewer (owner decision, see design) |
| Branch-Protection | 3 | no approver required, no code-owner review, rules do not apply to administrators | Tighten the ruleset to match |
| Pinned-Dependencies | 9 | `Dockerfile`: two base images not pinned by digest, three `npm` commands not pinned by hash | Pin by digest, install the runtime from a committed lockfile |
| CII-Best-Practices | 0 | no OpenSSF Best Practices badge | Earn the "passing" badge (owner registers the project), show it in the README |
| Signed-Releases | -1 | no signed release asset (the image is signed, the Release has no assets) | Attach the static build, its SBOM and keyless signatures to every Release |
| SAST, CI-Tests | -1 | Scorecard "internal error" listing check runs | Re-run, grant the token what the check needs, confirm |
| Maintained | 0 | "created within the last 90 days" | None: time fixes it. Recorded as expected |
| Contributors | 6 | two organizations | None: out of our hands |

Dangerous-Workflow, Token-Permissions, Binary-Artifacts, Vulnerabilities, Security-Policy, Fuzzing, Packaging, License and Dependency-Update-Tool are already 10 and must stay so.

## What Changes

- **Pinned runtime image.** Both `FROM` lines carry `@sha256:` digests; the runtime stage installs Wrangler with `npm ci` from a committed `docker/runtime/package-lock.json` (no `npm install <name>`); `corepack` is pinned by version and integrity. Dependabot gets the `docker` ecosystem and a second `npm` directory so the digests and the lockfile keep moving.
- **Review that Scorecard can see.** The ruleset requires one approving review and code-owner review, does not let anyone bypass it, and the existing `Agent review` workflow submits an `APPROVE` review only when the independent checks are green (spec gate, code-scanning alerts on the PR, scanner comments, secrets scan) and `REQUEST_CHANGES` otherwise.
- **Signed release assets.** The Release workflow attaches `retroboard-<version>-static.tar.gz`, its CycloneDX SBOM and keyless cosign signature bundles (`.sigstore.json` and `.sig`), plus the SLSA provenance of the build, so `Signed-Releases` has something to verify and users can check what they download.
- **Best Practices badge.** A checklist maps the OpenSSF "passing" criteria to the files that satisfy them; the owner registers the project on bestpractices.dev; the badge joins the README rows.
- **Scorecard reads true.** `scorecard.yml` gets the `checks: read` permission the two `-1` checks need, and the score is re-read after the first run on the new commit.
- A line in `docs/quality.md` records the checks we cannot move (Maintained until the project is 90 days old, Contributors) so nobody chases them.

Out of scope: more than one human maintainer, changing the licence, signing git commits (Scorecard does not check them).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform-security`: pinned build inputs, protected default branch with independent review, Scorecard readable.
- `release-delivery`: signed release assets.
