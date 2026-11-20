# Tasks

## 1. Format pages for search

- [ ] 1.1 Public and private route prefixes in `packages/protocol/src/routes.ts`; `indexing` switch in `apps/web/site.json` (default `none`) read by `nuxt.config.ts` (`robots` meta per route) and `apps/web/scripts/robots.mjs` (`robots.txt` with the allow list and `Sitemap:`), `apps/relay/src/core/headers.ts` (the switch reaches it as `_site.json`, written by `robots.mjs`) setting `X-Robots-Tag` on the private prefixes only; `docs/runbooks/deploy.md` describes the flip; verify unit tests of the three readers for both switch values and e2e `indexing.spec.ts` (header and meta on `/`, `/boards/`, `/check`; the "on" value is covered by the unit tests of the three readers and was checked once on a build)
- [ ] 1.2 Format pages `/formats/`, `/formats/<id>/`, `/en/formats/`, `/en/formats/<id>/` from the catalogue (`FormatPage.vue`, i18n keys fr and en for the chrome, canonical, `hreflang`, share metadata from the brand template), "Start this format" opening `/new?format=<id>` with the picker preselected, design tokens, axe clean in light and dark; verify e2e `format-pages.spec.ts` (content matches the catalogue for two formats in both languages, the start flow, axe) and a "Formats" guide chapter (`pnpm docs:tour && pnpm docs:guide`)
- [ ] 1.3 `apps/web/scripts/sitemap.mjs` in `pnpm generate` (public pages and format pages in both languages, no private URL) and a format page added to `scripts/quality/lighthouse.mjs`; verify a unit test of the sitemap against the catalogue and the route list, and `pnpm lighthouse` scoring SEO on `/formats/starfish/` (gated at 100 once the owner switches indexing on; while the site is noindex the crawlable audit fails by design)
- [ ] 1.4 What's new page `/whats-new` and `/en/whats-new` (`WhatsNewPage.vue`) from the latest releases of `CHANGELOG.md`, parsed once at build time by `apps/web/app/utils/changelog.ts` (read in `nuxt.config.ts`, inlined into the prerendered page), linked from the landing footer and listed in the sitemap, built in public and source available copy in fr and en, in Lighthouse and the guide; verify `apps/web/test/changelog.test.ts` (parser on a fixture and on the real file), the sitemap unit test and e2e `whats-new.spec.ts` (latest release in both languages and in the served HTML, footer link, no external request, axe in light and dark)

## 2. Launch kit

- [ ] 2.1 Posts `docs/launch/posts/{show-hn,product-hunt,linkedin,devto}.{fr,en}.md` (what it does, built in public and source available under PolyForm Noncommercial 1.0.0, nothing stored, end-to-end encrypted, links to the landing, the repository and the guide); verify `scripts/launch/test/posts.test.ts` (both languages per channel, the three links, the license, features present in the landing i18n keys)
- [ ] 2.2 `scripts/launch/media.mjs` (`pnpm launch:media`): one demo board per theme in light and dark and the 30 s captioned cut of the walkthrough recording, outputs under `docs/launch/media/`, hashes in `docs/launch/launch.json`, `scripts/launch/check.mjs` in `pnpm verify`; verify the command produces the files, the check fails after a theme is added and passes after regeneration, and the script creates its own demo board (no real board)
- [ ] 2.3 `docs/launch/README.md` (channels, order, who posts, the day-of checklist) and `docs/business-plan.md` 13.6 pointing at the kit; verify `pnpm verify` and the links of both documents resolve

## 3. Launch readiness

- [ ] 3.1 `scripts/quality/lighthouse.mjs` gains `--form-factor` and `--runs` (median kept), `quality/lighthouse-budgets.json` becomes per form factor with `mobile.landing.performance` at 0.95, `pnpm lighthouse` runs the landing on mobile three times; verify `scripts/quality/test/lighthouse-budget.test.ts` covers the median and the per-page budget, and `docs/quality.md` documents the flags and the duration
- [ ] 3.2 `pnpm launch:check` (`scripts/launch/readiness.mjs`, gates in `scripts/launch/gates.json`): streak, mobile Lighthouse, axe on the public pages, `brand-identity` and `landing-v2-and-product-video` archived, guide link; writes `docs/launch/readiness.md`; verify unit tests with mocked inputs for a failing and a passing run, and a doc test that `docs/roadmap.md` quotes the same gate values
- [ ] 3.3 Run the check, commit `docs/launch/readiness.md` with the date, link the kit and the check from the R2 section of `docs/roadmap.md`; verify the committed report matches the command output of the day and `pnpm verify` is green

## Workflow follow-up

- The owner posts the launch material on launch day in the order of `docs/launch/README.md`, once `pnpm launch:check` passes.
- Archive the change after the posts are out and the readiness report of launch day is committed.
