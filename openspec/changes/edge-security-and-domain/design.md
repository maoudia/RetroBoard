# Design

## Context

Worker `retroboard` is deployed by Workers Builds; `workers.dev` was disabled on first deploy. Domain `maoudia.com` is in the same Cloudflare account.

## Goals / Non-Goals

**Goals:** production domain, edge hardening using free features only, legal pages.
**Non-Goals:** paid add-ons, third-party analytics.

## Decisions

- Use a **Workers custom domain** (`routes: [{ pattern: "retroboard.maoudia.com", custom_domain: true }]`) so DNS and certificate are managed by Cloudflare.
- Dashboard-only settings (DNSSEC, HSTS, TLS minimum, Bot Fight Mode, WAF managed rules, custom rules) are recorded in `docs/runbooks/edge.md` with screenshots-free step lists, because they are not expressible in wrangler config. A monthly checklist issue reminds the owner.
- security.txt is a static file generated at build with an `Expires` one year ahead.
- Legal pages are static Nuxt pages using i18n; content reviewed by the owner.

## Risks / Trade-offs

- [HSTS preload is hard to undo] -> start with 6 months without preload, preload after 3 months without incident.
- [Free plan custom rule count unknown] -> list rules by priority; apply as many as allowed.
