# Brand charter

The visual identity of RetroBoard, written down once. Change: `brand-identity` (epic #450). The charter is the Studio theme (`packages/themes/src/studio.ts`) described in words: it adds no colour of its own, and `scripts/brand/test/charter.test.ts` fails when a value below differs from the theme or a text pair falls under 4.5:1.

Status: the mark and the signature are **proposals waiting for the owner's approval** (comment on #450). Nothing here replaces the current favicon or the header yet.

## Signature

| Language | Signature |
|---|---|
| fr | Des retros qui finissent en actions. |
| en | Retros that end in actions. |

Proposed in #451, to confirm or replace. The product name is written `RetroBoard` (one word, capital R and B), never "Retro Board" or "RETROBOARD".

## Colours

Values are the Studio theme tokens, light variant and dark variant (each participant picks one; the board theme stays the same). `Token` is the key of `ThemeTokens`; the CSS variable is the same name in kebab-case (`accentInk` is `--accent-ink`). The contrast column is the ratio of the text pair, light then dark; every pair is at least 4.5:1 (WCAG AA).

| Colour | Token | Light | Dark | Text pair | Contrast |
|---|---|---|---|---|---|
| Page | `bg` | `#f5f5f7` | `#111113` | `text` on `bg` | 15.46 / 16.87 |
| Surface | `surface` | `#ffffff` | `#1c1c1f` | `text` on `surface` | 16.83 / 15.21 |
| Ink | `text` | `#1d1d1f` | `#f2f2f4` | `text` on `bg` | 15.46 / 16.87 |
| Secondary text | `muted` | `#636366` | `#a1a1a8` | `muted` on `surface` | 5.99 / 6.62 |
| Accent | `accent` | `#0066cc` | `#4da3ff` | `accent` on `surface` | 5.57 / 6.48 |
| Accent ink | `accentInk` | `#ffffff` | `#06111f` | `accentInk` on `accent` | 5.57 / 7.22 |
| Danger | `danger` | `#c9251d` | `#ff6961` | `danger` on `surface` | 5.58 / 6.03 |
| Success | `success` | `#1d7a3a` | `#4cd07a` | `success` on `surface` | 5.39 / 8.59 |
| Sticky note | `note-1` | `#fff4c2` | `#fff4c2` | `noteInk` on `note-1` | 15.20 / 15.20 |

`note-1` is the first of `noteColors`: sticky notes keep their colour in both variants, with `noteInk` (`#1d1d1f`) as text. Components never hard-code a hex; they use the tokens (`docs/design-system.md`).

## Type

| Role | Typeface | Use |
|---|---|---|
| Body and interface | Inter Variable | Everything the product says; the wordmark (weight 650). |
| Accent | Fraunces italic | A word or a short phrase in a headline, never a paragraph. Marketing pages only. |
| Code and keys | JetBrains Mono | Keys, links, shortcuts, code. |

Every font is bundled with the site: no remote font, no CDN (CSP, `AGENTS.md`). Fraunces and JetBrains Mono are not in the bundle yet; the group that first uses them adds them, with their licence checked. Sizes come from `--fs-*` (`docs/design-system.md`).

## Tone of voice

- Calm and direct: say what happened and what to do, without apologising or shouting.
- Plain words over jargon: "retro", "note", "vote", "action"; no "synergy", no "empower".
- Active verbs, short sentences, the person as the subject ("you").
- Privacy stated as a fact, not a slogan: "encrypted in your browser, the relay never sees the content".
- No exclamation marks, no emoji in the product; a light touch of humour is allowed on the landing only.
- Every user-facing string exists in French and English (i18n), written for each language, not translated word for word.

## The mark

"Note-loop": a sticky note whose folded corner is at the top right, with a circular arrow inside, the retro that loops into actions. Drawn on the 24 px grid with a 2 px stroke, round caps and joins (the Lucide grid). Sources in `docs/brand/`:

| File | Use |
|---|---|
| [`mark.svg`](brand/mark.svg) | The mark alone, in colour: yellow note, ink outline, blue loop. |
| [`lockup.svg`](brand/lockup.svg) | The mark and the wordmark, in colour: README, press, share images. |
| [`mark-mono.svg`](brand/mark-mono.svg) | One colour (ink), for stamps, fax, embossing, single-colour print. |
| [`lockup-mono.svg`](brand/lockup-mono.svg) | The lockup in one colour. |

The app draws the mark inline with `currentColor` (a Vue component, task 1.2 of the change, after the owner's approval); the sources above are for everything else. PNG renders and the favicon set follow in group 2 of the change.

### Rules of use

- **Clear space**: keep at least a quarter of the mark's height free on every side (6 px on the 24 px grid).
- **Minimum size**: the mark alone 16 px; the lockup 96 px wide. Below that, use the mark alone.
- **Monochrome**: on a photo, a busy ground or a one-colour medium, use the `-mono` files in ink on light grounds and in white on dark grounds (change the stroke only).
- **Grounds**: the colour mark sits on `bg` or `surface` in light and dark; its yellow note is the same in both.
- **Do not**: stretch or rotate the mark, recolour the note or the loop, add a shadow or a gradient, outline the wordmark, set the wordmark in another typeface, redraw the loop, put the mark on a ground that cuts its contrast under 3:1.

## Renaming

The product name lives in three places, so a rename is one pull request:

1. the i18n key `brand.name` (fr and en);
2. `docs/brand/lockup.svg` and `lockup-mono.svg` (the wordmark text);
3. `apps/web/public/manifest.webmanifest` (`name`, `short_name`).

The name "RetroBoard" is a working name until the trademark search (INPI, EUIPO) is done, which is the owner's task (`docs/roadmap.md`, R1).

## Site origin

`apps/web/site.json` holds the site origin (`origin`, default `https://retroboard.maoudia.com`) that absolute URLs are built from (share images, group 3 of the change). A self-hosted instance changes it there only.

## Files of the identity

Listed here as they land; the press kit (logos in PNG, banner, screenshots) joins the list in group 3.

- [`brand/mark.svg`](brand/mark.svg), [`brand/mark-mono.svg`](brand/mark-mono.svg), [`brand/lockup.svg`](brand/lockup.svg), [`brand/lockup-mono.svg`](brand/lockup-mono.svg)
