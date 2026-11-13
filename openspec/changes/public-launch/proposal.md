# Proposal

## Why

RetroBoard launches publicly on 2026-12-13 (docs/roadmap.md, R2) with no analytics by design, so acquisition has to be built into the product and the repository: pages a search engine can find, launch posts ready to publish, and one command that says whether the launch gate is met (14 green nights, CLA live, Lighthouse mobile above 95 on the landing, axe without violation on the public pages). Today the whole site is `noindex` (`robots.txt` disallows everything, every response carries `X-Robots-Tag: noindex`), Lighthouse SEO is 54 on the landing, the gate is measured by hand, and `quality/lighthouse-budgets.json` asks only 0.80 performance, so the landing's 91 on mobile passes silently (launch study of 2026-11-12, section 3).

## What Changes

- **Indexing switched on for the public pages only**: `robots.txt`, the `robots` meta and the `X-Robots-Tag` header allow the landing, setup, legal, accessibility, guide and format pages and keep `/boards`, `/board`, `/check`, `/offline` and `/dev` out on all three channels; canonical URLs, `hreflang` alternates and a generated `sitemap.xml`. One configuration value switches indexing on.
- **One static page per retro format** (13 today, from the template catalogue of the domain), in French and English with their own URLs, with the columns, when to use it and a "Start this format" action that opens the setup page with the format selected.
- **A launch kit** in `docs/launch/`: posts for Show HN, Product Hunt, LinkedIn and dev.to in fr and en, a 30 s captioned demo cut from the landing walkthrough with Playwright, one screenshot per theme in light and dark, all produced from the generated site and checked for staleness like the user guide.
- **A launch readiness check**, `pnpm launch:check`: the nightly streak, Lighthouse on the landing on mobile (median of three runs, performance at least 0.95), axe on the public pages, the CLA state, the brand and landing changes archived, the guide reachable from the app; one line per gate, non-zero exit when one is red, the result written to `docs/launch/readiness.md`. The local Lighthouse gate gains the mobile form factor and a 0.95 performance budget on the landing.

Out of scope: the landing's performance fixes themselves (prerender of the public pages, trailing-slash redirects, skip link and demo-board contrast), implemented in `landing-v2-and-product-video` and only measured here; share images and metadata (`brand-identity`); the product walkthrough (`landing-v2-and-product-video` group 1; the 30 s cut reuses its recording); advertising, analytics, a blog, a newsletter, Search Console setup; posting the launch material, which is the owner's.

Bounded contexts: none (public site, documentation, quality scripts); the format pages read the catalogue of the Ideation context (`packages/domain`, read only). Relay traffic: none (static pages; a format page opens the existing setup flow).

Owner decisions, open until the owner answers (the tasks that depend on them say so):

1. **When to index.** Switch indexing on for the production domain `retroboard.maoudia.com` as soon as group 1 lands, or on launch day only? The switch is one value either way (task 1.1).
2. **Launch day and channels.** Show HN, Product Hunt, LinkedIn and dev.to are drafted; the owner chooses the order and the day for each (Product Hunt needs a hunter account and a date) and posts them.
3. **The gate definition.** The nightly gate was redefined on 2026-11-12 (two retries, a shrinking quarantine, WebKit out, counted by `pnpm nightly:streak`); the readiness check uses that definition. Confirm it is the one the launch uses.

## Capabilities

### New Capabilities

- `search-indexing`: which pages search engines may index, their canonical and language metadata, the sitemap and the format pages.
- `launch-kit`: the launch material kept in the repository and the readiness check that gates the launch.

### Modified Capabilities

None. The Lighthouse requirement of `platform-security` keeps its text (where Lighthouse runs is task 1.4 of `a11y-gate-and-derived-contrast`); the mobile form factor and the 0.95 budget are launch-gate requirements of `launch-kit`.

## Impact

- `packages/protocol/src/routes.ts` (public and private route prefixes), `apps/web/site.json` (`indexing`), `apps/web/nuxt.config.ts` (`robots` meta per route), `apps/web/public/robots.txt` replaced by a generated file (`apps/web/scripts/robots.mjs`), `apps/web/scripts/sitemap.mjs`, `apps/relay/src/headers.ts` (`X-Robots-Tag` on the private routes only; `asset-headers.mjs` unchanged for `/_nuxt/*`).
- New pages under `apps/web/app/pages/formats/` and `apps/web/app/pages/en/formats/` sharing one component, `new.vue` reading `?format=`, i18n keys fr and en, a guide chapter.
- `docs/launch/` (posts, media, readiness), `scripts/launch/` (media, check, readiness, gates), `scripts/quality/lighthouse.mjs` (`--form-factor`, `--runs`), `quality/lighthouse-budgets.json` (per form factor), `docs/quality.md`, `docs/roadmap.md`, `docs/runbooks/deploy.md`.
- Depends on `brand-identity` (share images on the format pages and in the posts) and on `landing-v2-and-product-video` (prerender, walkthrough recording); the readiness check reports their state rather than waiting for them.
