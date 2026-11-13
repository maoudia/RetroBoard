# Tasks

## 1. Charter and logo

- [ ] 1.1 `docs/brand.md`: signature in fr and en, colours with light and dark values mapped to the Studio tokens, type (Inter Variable, Fraunces italic accent, JetBrains Mono), tone of voice, rules of use of the mark, the three files a rename touches, and `apps/web/site.json` with the site origin; verify `scripts/brand/test/charter.test.ts` (quoted values equal the theme tokens, text pairs at least 4.5:1) passes in `pnpm verify`
- [ ] 1.2 Logo "note-loop" (sticky note whose folded corner draws a circular arrow, 24 px grid, 2 px stroke): `docs/brand/mark.svg`, `lockup.svg`, `mark-mono.svg`, `lockup-mono.svg`; `BrandMark.vue` (inline SVG, `currentColor`) in the app header, the landing nav and the setup page, product name from the i18n key `brand.name`; verify the owner's approval comment on #450 (mark and signature), e2e `tests/e2e/brand.spec.ts` (mark visible on `/`, `/new` and a board, axe clean in light and dark) and the guide regenerated for the chapters that show the header (`pnpm docs:tour && pnpm docs:guide`)

## 2. Icon kit

- [ ] 2.1 `scripts/brand/render.mjs` (`pnpm brand:render`, Playwright) renders from the SVG sources: `favicon.svg` with a dark variant through `prefers-color-scheme`, `favicon.ico` 32 px, `apple-touch-icon.png` 180 px, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (safe zone), `manifest.webmanifest` (name from `brand.name`, `theme_color` from the accent token) and `docs/brand/renders.json` with the source hashes; verify `scripts/brand/test/renders.test.ts` fails on a stale render and passes after the command, and the installability audits of `pnpm lighthouse` pass
- [ ] 2.2 Twelve pictograms (encrypted board, key link, agenda ring, vote ticket, group, carried-over action, presenter mode, join QR, export, self-host, agent, theme) in `apps/web/app/assets/icons/rb/` as the custom collection `rb`, used in the landing feature grid; verify a unit test that every file is 24 x 24 with 2 px strokes, e2e `brand.spec.ts` renders the grid with every request outside the origin failed and asserts the pictograms are drawn, and `pnpm size` stays within the bundle budget

## 3. Share images and press kit

- [ ] 3.1 Share template `docs/brand/og-template.svg`, renders `apps/web/public/og/fr.png` and `og/en.png` (1200 x 630, under 200 kB), the GitHub social banner `docs/brand/social-banner.png` (1280 x 640) and the README header; verify `renders.test.ts` covers them and `README.md` shows the banner
- [ ] 3.2 Open Graph and Twitter metadata on every public page from its i18n keys (`og:title`, `og:description`, `og:image` absolute from `apps/web/site.json`, `og:locale`, `twitter:card`), product name only and no image on the board, join and check pages; verify e2e `share-preview.spec.ts` reads the tags on `/`, `/new`, `/privacy` and a board page in fr and en, and `docs/self-hosting.md` documents `apps/web/site.json`
- [ ] 3.3 Press kit in `docs/brand/`: logos SVG and PNG (light, dark, monochrome), colours, signature, banner, screenshots copied from the guide pictures, all listed in `docs/brand.md` and linked from `README.md` and `CONTRIBUTING.md`; verify `renders.test.ts` and `pnpm verify` green
