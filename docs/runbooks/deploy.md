# Deploy and rollback

Design: ADR-0030.

## Today (Workers Builds, gated by the ruleset)

- Cloudflare Workers Builds deploys every push to `main` (build `pnpm generate`, deploy `npx wrangler deploy`), whatever
  the result of the checks: main only receives commits that passed the required checks (ruleset in
  `docs/runbooks/repo-settings.md`), so the deploy is gated. This is the setup in use; the CI deploy below is optional.
- `.github/workflows/post-deploy.yml` waits for the Cloudflare build of each commit, smoke tests `PROD_URL` and opens an
  urgent issue when production fails. Rollback stays manual (dashboard or `wrangler rollback`).
- Cloudflare builds non-production branches too; that check (`Workers Builds: retroboard`) is not required and fails on
  pull requests. Switch it off in Settings > Builds > Branch control if the noise bothers you.
- Smoke tests: `.github/workflows/smoke.yml` runs every 6 hours and on demand against the `PROD_URL` repository
  variable (`node scripts/smoke.mjs <url>` locally).

## Switch on the gated deploy from CI

`.github/workflows/deploy.yml` deploys a main commit only when Checks and Quality are green for it, smoke tests
production, and rolls back by itself when the smoke test fails. `.github/workflows/preview.yml` uploads a preview
version of each pull request and comments its URL. Both are dormant until you do this, once:

1. Create a Cloudflare API token with "Workers Scripts: Edit" (and "Account: Read") for this account.
2. Repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Repository variable `PROD_URL`
   (for example `https://retroboard.maoudia.com`). Both live in the `production` environment too if you add required
   reviewers there.
3. In Cloudflare, Workers > retroboard > Settings > Builds: disconnect the Git repository, or every push deploys twice.
4. Set the repository variable `CLOUDFLARE_DEPLOY` to `true`.

## Rollback

- Automatic: a failed smoke test after a deploy runs `wrangler rollback` to the previous version and fails the run.
- By hand: Cloudflare dashboard > Workers > retroboard > Deployments > previous version > Rollback, or
  `npx wrangler rollback` with an API token. Rolling back the Worker also rolls back the static assets (same deployable).
- Durable Object migrations (`migrations` in wrangler.jsonc) cannot be rolled back; review them in the pull request and
  deploy them alone. A run that fails after such a migration stays red on purpose.

## Container image

Built on release (`release.yml`): scanned with Trivy before it is pushed (a fixable critical or high finding stops the
release), signed with cosign (keyless), attested with build provenance, SBOM attached to the GitHub Release. Verify:

```bash
gh attestation verify oci://ghcr.io/maoudia/retroboard:<version> --repo maoudia/RetroBoard
cosign verify ghcr.io/maoudia/retroboard:<version> \
  --certificate-identity-regexp '^https://github.com/maoudia/RetroBoard/' \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```
