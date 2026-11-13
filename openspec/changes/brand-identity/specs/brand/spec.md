# Spec Delta

## Purpose
The visual identity of RetroBoard: one mark, one palette, one type scale and one tone, applied to the app, the site, the share previews and the press kit so that every surface is recognised as the same product.

## ADDED Requirements

### Requirement: Brand charter
The project SHALL publish a brand charter (`docs/brand.md`) that fixes the signature in French and English, the colours with their light and dark values, the typefaces, the tone of voice and the rules of use of the mark (clear space, minimum size, monochrome use, what not to do); the colours MUST be tokens of the Studio theme and every text colour pair MUST reach the WCAG AA contrast ratio in light and dark.

#### Scenario: A contributor needs the colours
- **WHEN** a contributor opens the brand charter
- **THEN** each colour is listed with its hex value for light and dark, the theme token it maps to and the contrast ratio of its text pair

#### Scenario: Charter and theme drift
- **WHEN** a colour quoted in the charter differs from the Studio theme token it names
- **THEN** the unit test of the charter fails and names the colour

### Requirement: One mark everywhere
The product SHALL show one mark (the "note-loop" logo) in the app header, on the landing, as the favicon, as the installed-app icons and in the README, from SVG sources kept in the repository as a lockup (mark and wordmark), a mark alone and a monochrome version; the product name shown in the interface and in the wordmark SHALL come from one i18n key and one SVG file so that a rename changes those two files and the web manifest only.

#### Scenario: Dark interface
- **WHEN** the interface is in its dark variant or the browser tab strip is dark
- **THEN** the favicon and the header mark stay legible (the SVG favicon follows `prefers-color-scheme`)

#### Scenario: Installed on a phone
- **WHEN** a person installs the app on an Android or iOS home screen
- **THEN** the icon shows the mark without clipping (maskable icon with its safe zone) and the manifest names the product

### Requirement: Product pictograms
The landing feature grid SHALL use the product pictograms (encrypted board, key link, agenda ring, vote ticket, group, carried-over action, presenter mode, join QR, export, self-host, agent, theme) drawn on the Lucide grid (24 px, 2 px stroke, round caps and joins) and bundled with the site; rendering them MUST NOT send any request outside the site origin.

#### Scenario: Landing renders its feature grid
- **WHEN** the landing loads and shows the feature grid
- **THEN** every pictogram is drawn from the local icon bundle and no request for an icon leaves the site origin

### Requirement: Share previews
Every public page (landing, setup, legal notice, privacy, terms, accessibility statement, guide, format pages) SHALL carry Open Graph and Twitter card metadata (title, description, an image of 1200 x 630 served from the site origin, locale) in the language of the page; the board, join and check pages MUST carry the product name only, no description and no image that could name a board.

#### Scenario: Landing link pasted in a chat
- **WHEN** the landing URL is pasted in Slack, Teams or LinkedIn
- **THEN** the preview shows the French or English share image, the title and the signature

#### Scenario: Board link pasted in a chat
- **WHEN** a board link is pasted in a chat
- **THEN** the preview shows the product name only, no board title and no board-specific image

### Requirement: Press kit
The repository SHALL hold a press kit under `docs/brand/`: the logos as SVG and PNG (light, dark, monochrome), the colour list, the signature, the GitHub social banner and current screenshots in light and dark, each listed in `docs/brand.md`; the PNG files MUST be regenerated from the SVG sources by one command and a check in `pnpm verify` MUST fail when a source changed and its renders did not.

#### Scenario: Journalist downloads the logo
- **WHEN** someone opens `docs/brand.md` from the repository
- **THEN** the lockup, the mark and the monochrome version are one click away in SVG and PNG

#### Scenario: Stale render
- **WHEN** the SVG template of the share image changes and the PNG is not regenerated
- **THEN** `pnpm verify` fails and names the command that regenerates it
