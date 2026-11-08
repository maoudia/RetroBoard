# Design

## Options for the release engine

| Option | For | Against |
|---|---|---|
| A. Keep release-please, let the workflow merge its PR when main is green | Already in place (manifest, CHANGELOG, v1.2.0 history); changelog is a reviewable file; no extra dependency | The PR created with `GITHUB_TOKEN` does not trigger checks, so the gate is the checks of the commit on main |
| B. semantic-release | Fully automatic, no PR | Pushes a version commit to main; second tool, new dependencies and history to migrate |
| C. Own script (conventional-changelog) | Total control | We maintain a release tool |

Chosen: A. Automatic means no human step, not no gate: the workflow runs only after the `Checks` and `Quality` runs of the same commit succeeded.

## Flow

1. `Release` runs on `workflow_run` completed of `Checks` or `Quality` (branch main, conclusion success), and on manual dispatch.
2. Gate: both runs exist for the head commit and succeeded; otherwise stop quietly (the other workflow triggers the run when it finishes).
3. release-please opens or updates the release PR. If there is one, the workflow squash-merges it with `GITHUB_TOKEN` (main is unprotected; if protection is added later the owner grants the bot a bypass).
4. release-please runs again: the merge commit is on main, so it creates the tag and the GitHub Release (notes = the changelog section).
5. If a release was created, the image job builds and pushes to GHCR in the same workflow (events created with `GITHUB_TOKEN` do not start other workflows).
6. A `concurrency` group serialises runs; releases never cancel each other.

Merging the release PR with `GITHUB_TOKEN` does not start `Checks` or `Quality` on the release commit. That commit only changes `CHANGELOG.md`, `package.json` and the manifest, so the previous green result stays valid.

## Conventional Commits

`scripts/commits/check.mjs` validates the header `type(scope)!: subject` against the type list (`feat fix perf refactor docs test build ci chore revert style`), a 120 character limit and a non-empty subject. No dependency. It runs as `commit-msg` hook, on push and on pull request (every commit and the PR title, because squash merge uses the title). Merge commits and release-please commits are accepted.

## Image

Multi-stage Dockerfile. Build stage: pnpm install, `pnpm generate`, `wrangler deploy --dry-run --outdir` to bundle the Worker. Runtime stage: node slim plus `wrangler` pinned to the lockfile version, serving the bundle and static assets with the local workerd runtime (`wrangler dev --local`), no Cloudflare account, no storage, port 8787, non-root user. Labels: source, version, revision, license `AGPL-3.0-only`. Multi-arch through QEMU. Build provenance attestation.

Open question (a verifier): whether `wrangler dev` is acceptable as a production-like runtime for self-hosters. The alternative is a direct workerd config. The image documents that it is meant for self-hosting and small teams, and `docs/self-hosting.md` says so.
