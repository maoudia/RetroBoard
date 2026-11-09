# Design

## Decision 1: who approves (owner decision, default proposed)

Scorecard's Code-Review counts a changeset as reviewed when someone other than its author approved it. The project is fully agentic with one owner who does not read every pull request, so a human approval on each one would stop the pipeline. Options:

1. **Independent automated reviewer (proposed).** `Agent review` already runs on every pull request. It becomes a real gate: it checks the spec gate result, open code-scanning alerts on `refs/pull/<n>/merge`, `github-advanced-security` and Dependabot comments, secrets scan, and that the commits are Claude-only; then posts `APPROVE` (or `REQUEST_CHANGES` with the list). It uses a separate identity from the author (`github-actions[bot]` with "Allow GitHub Actions to create and approve pull requests" enabled), so the approval is real from GitHub's and Scorecard's point of view. Cost: none. Limit: it is a machine check, not a human one, and the docs must say so.
2. **Owner approves.** Honest and strongest, blocks the flow until the owner acts. Rejected as the default.
3. **Leave Code-Review at 0.** Cheapest. Rejected: it also keeps Branch-Protection at 3.

If the owner prefers option 2 or 3, tasks 2.1-2.3 change and nothing else does.

## Decision 2: branch protection

Ruleset on `main`: required approvals 1, dismiss stale approvals (already on), code-owner review (`.github/CODEOWNERS` exists), last-push approval off (the bot approves after the last push), no bypass actors, including administrators. The release flow merges its own pull request through auto-merge, which respects the same rules, so it keeps working. `docs/runbooks/repo-settings.md` is updated in the same change.

## Decision 3: reproducible runtime image

- `docker/runtime/package.json` pins `wrangler` to the version in `wrangler.version` (a test fails if they differ) and `docker/runtime/package-lock.json` pins the tree with integrity hashes. The Dockerfile runs `npm ci --omit=dev --ignore-scripts` there. Dependabot updates both the lockfile and the digests.
- `corepack` is installed from the lockfile of the build stage the same way, or dropped if `pnpm` can be provided by the lockfile's package manager field alone.
- The trivy fix of 1.51.1 (npm removed after install) stays; `npm ci` runs before the removal.

## Decision 4: signed release assets

The Release workflow already has `id-token: write`, cosign and the SBOM step. It adds, for the created tag: `tar czf retroboard-<v>-static.tar.gz` of the generated site, `cosign sign-blob --bundle` on the tarball and the SBOM (assets `.sigstore.json`), `actions/attest-build-provenance` (already used for the image) for the tarball, then `gh release upload`. Scorecard recognises `.sigstore.json`; a detached `.sig` is also uploaded because older readers look for it. Verification command goes into `docs/self-hosting.md`.

## Decision 5: what we do not chase

`Maintained` turns green by itself when the repository is 90 days old and has recent commits. `Contributors` needs people from other organizations. Both are documented as expected in `docs/quality.md`.

## Verification

Local: `actionlint` and `zizmor` on the workflows, `docker build` is not available on the dev machine so the image job in CI is the check (Trivy must stay green), a unit test for the wrangler version pin. After merge: a Scorecard run on the new head, expected at least 9.0; the exact score and any remaining gap are written into `docs/quality.md`.
