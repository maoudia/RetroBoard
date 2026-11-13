# Proposal

## Why

RetroBoard launches publicly on 2026-12-13 (docs/roadmap.md, R2) with a favicon drawn in a hurry, no logo, no share image and no brand page: a link pasted in Slack, Teams or LinkedIn shows a bare title, and every launch post would look unfinished. The roadmap review of 2026-11-04 made the brand a launch prerequisite (epic #450); the launch study of 2026-11-12 confirms it is on the launch path.

## What Changes

- A brand charter, `docs/brand.md`: signature, colours, type, tone and the rules of use of the mark, built on the Studio theme tokens that already exist in `packages/themes` (no new dependency, no remote font).
- A logo, "note-loop" (a sticky note whose folded corner draws a circular arrow): mark, lockup and monochrome versions as SVG sources in `docs/brand/`, shown by the app header, the landing and the README.
- An icon kit: a favicon that adapts to dark, `favicon.ico`, the Apple touch icon, the 192 and 512 px icons and the maskable one, the web manifest; twelve product pictograms on the Lucide grid for the landing feature grid, bundled with the site.
- Share images: Open Graph images 1200 x 630 in French and English rendered from one SVG template, `og:*` and `twitter:card` metadata on the public pages, the GitHub social banner 1280 x 640 and a README header; a press kit in `docs/brand/` (logos SVG and PNG, colours, screenshots).

Out of scope: a brand page on the site (the press kit lives in the repository), new themes, renaming the product (owner decision 1 below), the landing redesign (`landing-v2-and-product-video`), the launch posts that use these assets (`public-launch`), indexing and SEO metadata other than the share preview (`public-launch`).

Bounded contexts: none (static assets and page metadata; Themes supplies the tokens, read only). Relay traffic: none.

Owner decisions, open until the owner answers (the tasks that depend on them say so):

1. **Brand name and trademark.** "RetroBoard" stays the working name; the trademark search and filing (INPI, EUIPO) are the owner's task (docs/roadmap.md, R1). The design keeps the name in three places so that a rename is one pull request.
2. **The mark.** The owner approves the logo before it replaces the current favicon and enters the header (a taste call; task 1.2 waits for the approval comment on #450).
3. **The signature.** Issue #451 proposes fr "Des retros qui finissent en actions." and en "Retros that end in actions."; to confirm or replace in the charter.

## Capabilities

### New Capabilities

- `brand`: the visual identity the product and the site serve: mark, colours, type, pictograms, share previews and the press kit.

### Modified Capabilities

None.

## Impact

- `docs/brand.md`, `docs/brand/` (SVG sources, PNG renders, press kit), `apps/web/public/` (favicons, icons, manifest, `og/` images), `apps/web/site.json` (site origin used for absolute image URLs), `apps/web/nuxt.config.ts` head (`og:*`, `twitter:*` defaults, custom icon collection), the header and landing components that show the mark, `README.md` header, `apps/web/app/assets/icons/rb/` (pictograms), `scripts/brand/` (render script and tests).
- No new runtime dependency: the fonts are the bundled Inter Variable and Fraunces, the renders are made with the Playwright already installed and committed; CSP unchanged (no inline style, no third-party origin); bundle budget checked by `pnpm size`.
