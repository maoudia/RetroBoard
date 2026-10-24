# Design

## Context

Layout uses fixed column widths and a dense toolbar; i18n labels in English are shorter than French ones.

## Decisions

- Breakpoints as CSS custom media in one place (`packages/ui/tokens`), container queries on columns and the toolbar.
- Fluid type: `clamp()` scale with a TV multiplier driven by a `data-screen="tv"` attribute (auto from width, manual in presenter mode).
- Phone: `ColumnPager` with scroll-snap and a tab bar; menus as bottom sheets (native `<dialog>`), drag replaced by long-press + drop targets.
- Overflow detection test: Playwright script walks visible elements and compares `scrollWidth`/`clientWidth` with a tolerance.
- Pseudo-locale generated from `fr` at build time, available only when `import.meta.dev` or `?lang=pseudo` on preview deployments.

## Risks / Trade-offs

- [Drag and drop on touch is unreliable] -> explicit "Group with..." action in the note menu as an alternative.
- [Visual baselines multiply] -> limit to key screens.
