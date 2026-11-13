# Design

## Context

- Visual sources today: `apps/web/public/favicon.svg` (a blue rounded square with a note and a circular arrow, drawn during `stabilise-main`), PNG icons and `manifest.webmanifest` (`theme_color` `#0066cc`); the landing (`apps/web/app/pages/index.vue`) carries its own palette (`--ink #1d1d1f`, `--fill #f5f5f7`, `--blue #0071e3`); the Studio theme (`packages/themes/src/studio.ts`) has `accent #0066cc`, `text #1d1d1f`; notes are `#fff4c2`.
- Fonts bundled by the build: Inter Variable (body), Fraunces (display accent), JetBrains Mono. No remote font is allowed (CSP, AGENTS.md).
- Head metadata: `nuxt.config.ts` (`app.head`) and per-page `useHead` (`index.vue`, `LegalPage.vue`, `ServicePage.vue`, `boards.vue`). Every page is `noindex` until `public-launch` flips it; share metadata is useful before that (chat unfurlers do not read `robots`).
- Icons: `@nuxt/icon` with `provider: 'none'`, a scanned client bundle plus an explicit `dynamicIcons` list. The Static build job and the container image have no browser.
- The charter content was drafted in the 2026-11-04 diagnosis (issue #451): signature, colours `#1d1d1f`, `#f5f5f7`, `#0066cc`, `#fff4c2`, dark `#111113` and `#4da3ff`, Inter Variable with a Fraunces italic accent, the "note-loop" logo on a 24 px grid with a 2 px stroke.
- See proposal.md for the motivation and the owner decisions.

## Goals / Non-Goals

**Goals:**
- One source per asset (SVG), the renders committed, a test that catches drift between the charter, the theme tokens and the renders.
- A rename stays cheap: three places, listed in the charter.
- No new dependency, no runtime cost, no CSP change.

**Non-Goals:**
- A public brand page, a component library (`design-system-components`), new themes, an animated logo.

## Decisions

1. **The charter is the Studio theme, written down.** `docs/brand.md` names tokens (`--accent`, `--text`, `--bg`, `--note-*`) and quotes their values; `scripts/brand/test/charter.test.ts` reads `docs/brand.md` and `@retroboard/themes` and fails when a quoted value differs from the token or a text pair falls under 4.5:1 (the themes package already has the contrast helper). Alternative: a separate brand palette. Rejected: two sources drift and the site would stop looking like the app.
2. **SVG sources in `docs/brand/`, renders committed, produced by `pnpm brand:render`** (`scripts/brand/render.mjs`: Playwright screenshots of the SVG files at the required sizes: favicon PNG set, share images in fr and en, GitHub banner). `docs/brand/renders.json` records the hash of each source next to its renders and `scripts/brand/test/renders.test.ts` checks it in `pnpm verify` (the pattern of `apps/web/public/guide/guide.json` and `pnpm docs:check`). Alternative: render during `pnpm generate`. Rejected: the Static build job and the container image have no browser, and the share image URL must be stable anyway.
3. **The mark in one Vue component**, `BrandMark.vue` (inline SVG, `currentColor`, a size prop), used by the app header, the landing nav and the setup page. The product name comes from the i18n key `brand.name`; the lockup for the README and the renders is `docs/brand/lockup.svg`. A rename touches `brand.name`, `lockup.svg` and `manifest.webmanifest` (listed in `docs/brand.md`).
4. **A favicon that adapts to dark**: `favicon.svg` embeds a `<style>` block with `@media (prefers-color-scheme: dark)`. The SVG is a separate document fetched by the browser, so the page CSP does not apply to it. `favicon.ico` 32 px stays for old clients; `apple-touch-icon.png` 180 px, `icon-192.png`, `icon-512.png` and `icon-maskable-512.png` (mark centred in the 80 percent safe zone) are produced by `pnpm brand:render`.
5. **Pictograms as a custom icon collection** `rb` (`apps/web/app/assets/icons/rb/*.svg`, declared in `icon.customCollections` of `nuxt.config.ts`), used as `rb:encrypted-board`. They ship in the local client bundle like the Lucide icons, so `provider: 'none'` stays and no request leaves the origin. Alternative: twelve inline SVG components. Rejected: no consistency with `<Icon>` and more code to maintain.
6. **Share images per language from one SVG template** (`docs/brand/og-template.svg` with `{title}` and `{signature}` placeholders filled by the render script) to `apps/web/public/og/fr.png` and `og/en.png`, 1200 x 630, under 200 kB each. `nuxt.config.ts` sets the defaults (`og:type`, `og:site_name`, `twitter:card` `summary_large_image`); each public page sets `og:title`, `og:description`, `og:image` and `og:locale` through `useHead` from its i18n keys. The absolute image URL is built from `apps/web/site.json` (`origin`, default `https://retroboard.maoudia.com`, documented for self-hosting). `boards.vue` and `board.vue` set `og:title` to the product name and no image.
7. **Screenshots of the press kit come from the guide tour** (`pnpm docs:tour` already produces light and dark pictures of the real app); the render script copies the ones listed in `docs/brand.md`. No second screenshot pipeline.

Types and ports: nothing in the domain or application layers. A Vue component and static assets in `apps/web`, scripts and tests under `scripts/brand/`.

## Security and privacy

The relay observes nothing new: the assets are static files served by the asset layer and the share metadata is in the HTML of the public pages. Board pages carry no board-specific metadata, so a pasted board link reveals no title to a chat unfurler (the key stays in the fragment, which unfurlers never send). No third-party origin, no inline style on the page (the favicon's own `<style>` lives in a separate SVG document).

## Risks / Trade-offs

- [The owner rejects the mark] -> the charter, the icon set and the share template take the mark as one SVG input; a new mark is one file and one `pnpm brand:render`.
- [A rename after the launch] -> three places listed in `docs/brand.md`; share images and PNG icons regenerate in one command.
- [Committed PNG renders grow the repository] -> under 1 MB in total; the press kit screenshots reuse the guide images already committed.
- [The custom icon collection is not picked up by the client bundle] -> the e2e of task 2.2 renders the feature grid with every request outside the origin failed and asserts the pictograms are drawn.
- [Absolute image URLs differ on a self-hosted instance] -> `apps/web/site.json` is the one place, documented in `docs/self-hosting.md`.

## Migration Plan

1. Group 1 lands the charter, the SVG sources and the header mark.
2. Group 2 replaces the favicons and icons (same file names, `Cache-Control: no-cache` on HTML; an installed app may need a reinstall to refresh its icon).
3. Group 3 adds the share metadata and the press kit; `public-launch` then switches indexing on.

Rollback: revert the pull request of the group; nothing is stored anywhere.

## Open Questions

- Does the owner want the loop arrow of the mark to draw itself on the landing hero? It can be added in `landing-v2-and-product-video` without changing these specs.
- Should the signature differ between French and English beyond translation? The charter takes the owner's wording when the text is approved.
