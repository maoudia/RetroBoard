# Deploy and rollback

Design: ADR-0030.

## Today

The Cloudflare Workers Builds Git integration is switched off (2026-11-08): production is deployed by
`.github/workflows/deploy.yml` only, from a green main commit. **Until the secrets below exist, nothing deploys.**
Smoke tests also run every 6 hours (`.github/workflows/smoke.yml`, `PROD_URL` is set).

## Switch on the gated deploy from CI

`.github/workflows/deploy.yml` deploys a main commit only when Checks and Quality are green for it, smoke tests
production, and rolls back by itself when the smoke test fails. `.github/workflows/preview.yml` uploads a preview
version of each pull request and comments its URL. Both are dormant until you do this, once:

1. Create a Cloudflare API token with "Workers Scripts: Edit" (and "Account: Read") for this account.
2. Repository secrets: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (`PROD_URL` is already set). Both live in the `production` environment too if you add required
   reviewers there.
3. Cloudflare Workers Builds is already off (do not turn it on again: every push would deploy twice).
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
