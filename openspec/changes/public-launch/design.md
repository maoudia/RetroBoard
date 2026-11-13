# Design

## Context

- The site is a static Nuxt SPA (`ssr: false`), prerendered as the app shell; the landing scores 91 on mobile because the hero waits for 338 kB of JavaScript (launch study of 2026-11-12, section 3). The prerender of the public pages and the trailing-slash fix are implemented in `landing-v2-and-product-video`; the format pages assume prerendered HTML once it lands and work as client routes with full `useHead` metadata before (Lighthouse SEO audits run the JavaScript).
- Indexing is off on three channels: `nuxt.config.ts` meta `robots: noindex, nofollow`, `apps/web/public/robots.txt` with `Disallow: /`, and `X-Robots-Tag: noindex, nofollow` set by `apps/relay/src/headers.ts` on every Worker response and by `apps/web/scripts/asset-headers.mjs` on `/_nuxt/*`.
- The language is detected in the browser (`plugins/theme.client.ts` sets `lang`); URLs carry no locale. French is the source language.
- The template catalogue (`packages/domain/src/catalogue/templates.ts`, `templates.en.ts`, `localizeTemplate`) holds 13 formats with name, description, columns (title and hint) and the goals, time and theme the suggestion engine uses. `new.vue` already reads `clone` and `solo` from the query.
- Quality scripts: `scripts/quality/lighthouse.mjs` (4 pages, light and dark, desktop only, budgets in `quality/lighthouse-budgets.json` with performance 0.80), `scripts/quality/nightly-streak.mjs` (`pnpm nightly:streak -- --target=14`), the guide pipeline (`pnpm docs:tour`, `docs:guide`, `docs:check` with hashes in `guide.json`), `tests/e2e/a11y.spec.ts`.
- CLA mechanics: `.github/workflows/cla.yml`, `scripts/ci/cla-check.mjs` (branch `cla-signatures`, status `CLA`), `docs/CLA.md` headed DRAFT (change `open-source-business`, group 1).
- See proposal.md for the motivation and the owner decisions.

## Goals / Non-Goals

**Goals:**
- Indexing is one switch; private routes are never indexable whatever the switch says.
- Format pages are generated from the catalogue, never written by hand, in both languages at their own URLs.
- The launch material is reproducible from the generated site; the readiness check is the only definition of "ready".

**Non-Goals:**
- Locale prefixes on the whole site (the landing stays `/` with the detected language); a blog or CMS; analytics; server-side rendering at request time; Search Console or social accounts setup.

## Decisions

1. **One switch, `indexing` in `apps/web/site.json`** (`"none"` or `"public"`; `"none"` by default, including for self-hosting). `nuxt.config.ts` writes the `robots` meta per route from it, `apps/web/scripts/robots.mjs` writes `robots.txt` (the allow list plus `Sitemap:`) during `pnpm generate`. The private route prefixes (`/boards`, `/board`, `/check`, `/offline`, `/dev`) live in `packages/protocol/src/routes.ts`, a pure constant both the web scripts and the relay import; `apps/relay/src/headers.ts` sets `X-Robots-Tag: noindex, nofollow` for those prefixes only, independent of the switch, and `asset-headers.mjs` keeps it on `/_nuxt/*`. Flipping production is a one-line pull request on `site.json` (no workflow edit, no secret). Alternative: edit three files by hand on launch day. Rejected: three edits to forget and nothing to test.
2. **Format pages at `/formats/<id>/` (French) and `/en/formats/<id>/` (English)**, plus the two index pages, one component `FormatPage.vue` with the content language forced by the route (the chrome follows the person's language), canonical to itself, `hreflang` fr, en and `x-default` pointing at the French page. Alternative: one URL with the detected language. Rejected: a crawler sees one language and the other is never indexed. Alternative: `/fr/formats/`. Rejected: the source language stays unprefixed like the rest of the site.
3. **"Start this format" opens `/new?format=<id>`**: `new.vue` gains `format` next to `clone` and `solo` and preselects the template in the picker. The e2e of the format page follows the click and asserts the picker state.
4. **Sitemap generated during `pnpm generate`** by `apps/web/scripts/sitemap.mjs` next to `security-txt.mjs`, from the public route list and the catalogue (`@retroboard/domain` is already imported by `nuxt.config.ts`), `lastmod` from the generate date; written to `.output/public/sitemap.xml`.
5. **Launch material under `scripts/launch/`** reuses the guide tour's browser setup: `media.mjs` creates a demo board per theme (invented content, never a real board), takes the screenshots in light and dark, and cuts the first 30 s of the walkthrough recording of `landing-v2-and-product-video` task 1.3 with the captions burnt in (ffmpeg is already used by `scripts/docs/video.mjs`). `docs/launch/launch.json` records the source hashes (themes list, walkthrough script, post sources); `scripts/launch/check.mjs` compares them in `pnpm verify` like `docs:check`. Posts are Markdown files `docs/launch/posts/<channel>.<fr|en>.md`; `scripts/launch/test/posts.test.ts` checks each has both languages, the three links, the license, and names only features present in the landing i18n keys.
6. **`pnpm launch:check` composes existing checks** (`scripts/launch/readiness.mjs`): `nightly-streak.mjs`, `lighthouse.mjs --form-factor=mobile --runs=3` (new flags, median kept), `pnpm e2e -- a11y.spec.ts --project=chromium`, the CLA state (`docs/CLA.md` without `DRAFT`, `git ls-remote --heads origin cla-signatures`, the `main` ruleset listing `CLA` through `gh api`), the archive folders of `brand-identity` and `landing-v2-and-product-video`, and the guide link e2e. The gate values are in `scripts/launch/gates.json` (streak 14, performance 0.95, accessibility 0.95); a doc test checks `docs/roadmap.md` quotes them. The command needs a running site (`pnpm dev:worker`) and `gh` authentication; `docs/quality.md` documents it.
7. **Per-form-factor budgets** in `quality/lighthouse-budgets.json`: the current object becomes `desktop`, and `mobile.landing` sets `performance: 0.95`; `scripts/quality/lighthouse-budget.mjs` evaluates per page and form factor; three runs only for the landing on mobile (the study measured the first run 13 to 16 points lower on a cold cache), one elsewhere, so the local gate stays under ten minutes.

Types and ports: `packages/protocol/src/routes.ts` (route prefixes, pure); `apps/web` pages, `FormatPage.vue` and one composable `useFormatPage` (catalogue read); scripts under `apps/web/scripts/` and `scripts/launch/`. No domain or application change; the catalogue is read as is.

## Security and privacy

The relay observes nothing new: format pages and the sitemap are static files; the readiness check runs on the maintainer's machine and calls the GitHub API with the maintainer's own token. Indexing exposes only pages that carry no user data; board, join and check routes stay `noindex` on three channels and the board key never leaves the fragment. The launch screenshots and the demo video are taken on demo boards created by the script with invented content. No third-party script, no tracking pixel; images in the posts are hosted on the site origin or on GitHub.

## Risks / Trade-offs

- [The prerender of `landing-v2` slips] -> the format pages ship as client routes with full head metadata; the readiness check shows the mobile performance as red until it lands, which is the truth.
- [A crawler reaches a board route through a link] -> the Worker sets `X-Robots-Tag` on the private prefixes whatever the switch; the e2e of task 1.1 covers both switch values.
- [Three Lighthouse runs lengthen the local gate] -> three runs for the landing on mobile only.
- [The owner delays the indexing switch] -> everything else ships; the flip is a one-line pull request on `site.json`, documented in `docs/runbooks/deploy.md`.
- [Posts go stale before launch day] -> the unit test pins their facts to the landing i18n keys and the readiness check runs on launch day.

## Migration Plan

1. Group 1 ships the switch (off), the private-route header, the sitemap and the format pages.
2. The owner answers decision 1; a one-line pull request sets `indexing` to `public`; the next deploy flips the three channels together.
3. Groups 2 and 3 ship the kit and the check; the check runs during the last two weeks and on launch day.

Rollback: set the switch back to `none` and redeploy; remove the sitemap from any search console it was submitted to.

## Open Questions

- Product Hunt on launch day or a week later (Show HN and Product Hunt on the same day split attention)? The posts are drafted either way.
- Should `/en/` also cover the landing after the launch? That would be a follow-up change, not this one.
