# Design

## Context

Layout uses fixed column widths and a dense toolbar; i18n labels in English are shorter than French ones.

## Decisions

- Breakpoints in one place (`packages/themes/src/screens.ts`; `packages/ui` does not exist yet), written on `<html>` as `--bp-*` custom properties next to `data-screen`; CSS cannot read them in a media query, so rules select on `[data-screen]` or repeat the pixel value; container queries on columns and the toolbar.
- Fluid type: `clamp()` scale with a TV multiplier driven by a `data-screen="tv"` attribute (auto from width, manual in presenter mode).
- Phone: `ColumnPager` with scroll-snap and a tab bar; menus as bottom sheets (native `<dialog>`), drag replaced by long-press + drop targets.
- Overflow detection test: Playwright script walks visible elements and compares `scrollWidth`/`clientWidth` with a tolerance.
- Pseudo-locale generated from `fr` at run time by a pure function (`packages/i18n/src/pseudo.ts`: accents, +40% by stretching vowels, `[` `]` markers, `{placeholders}` untouched), switched on only by `?lang=pseudo` for that page load. A preview deployment is the same bundle as production, so the parameter cannot be tied to the host: it is never stored, never part of `LOCALES` or the settings, so nobody can select it. A key missing from the dictionaries is returned bare, without markers, so it stays visible. Content translated from other sources (template columns, theme texts) keeps the real language.

## Risks / Trade-offs

- [Drag and drop on touch is unreliable] -> explicit "Group with..." action in the note menu as an alternative.
- [Visual baselines multiply] -> limit to key screens.
