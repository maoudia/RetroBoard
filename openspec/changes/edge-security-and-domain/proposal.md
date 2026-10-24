# Proposal

## Why

The official site moves to `retroboard.maoudia.com`. The Cloudflare free plan offers edge protections (TLS, WAF managed rules, bot mitigation, Turnstile) we are not using yet, and a French site needs legal pages.

## What Changes

- Custom domain `retroboard.maoudia.com` on the Worker, `workers.dev` kept for previews only.
- HTTPS-only, HSTS, modern TLS, DNSSEC, CAA.
- Free WAF managed rules, Bot Fight Mode, a small set of custom rules; documented in a runbook (dashboard settings are not code).
- `/.well-known/security.txt`, privacy page, legal notice (mentions legales), terms of use page.
- Workers traces enabled; logs stay content-free.

Out of scope: paid WAF features, analytics scripts, cookie banners (no cookies are used).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `platform-security`: adds transport security, security contact and legal pages requirements.

## Impact

- `wrangler.jsonc` (routes, custom domain, traces), `apps/web` pages, `docs/runbooks/edge.md`.
- Free-plan budget: no change.
