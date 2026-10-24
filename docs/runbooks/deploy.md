# Deploy and rollback

- Deployment: Cloudflare Workers Builds deploys every push to `main` (build `pnpm generate`,
  deploy `npx wrangler deploy`). There is no deploy job in GitHub Actions.
- Smoke tests: `.github/workflows/smoke.yml` runs every 6 hours and on demand against the
  `PROD_URL` repository variable (`node scripts/smoke.mjs <url>` locally).
- Rollback: Cloudflare dashboard > Workers > retroboard > Deployments > previous version >
  Rollback, or `npx wrangler rollback` with an API token. Rolling back the Worker also rolls
  back the static assets (same deployable).
- Durable Object migrations (`migrations` in wrangler.jsonc) cannot be rolled back; review
  them in the pull request and deploy them alone.
