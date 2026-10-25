# Design

## Decisions

- **IP rule** (blocking in review, `docs/themes-ip.md`): a theme may evoke a genre (colours, era, materials, generic motifs like stars, sails, wands, checkered flags) but never a specific work: no titles or character names, no logos or emblems, no distinctive costumes or ships, no quotes or catchphrases, no soundtrack motifs, no fonts imitating a franchise logo. Theme names are generic English words checked against EUIPO and USPTO searches (manual step recorded in the PR).
- **Assets**: CSS and inline SVG drawn for the project, licensed under the project license; fonts SIL OFL 1.1 only, bundled locally (CSP forbids remote fonts).
- **Performance**: ambient effects under 2 ms per frame, paused when the tab is hidden, off with reduced motion and on TV mode by option.
- **Trend check**: before the owner's choice, a short note lists which genres are popular in 2026 (sources cited) so the list matches the audience.

Where things live: `packages/themes/src/<id>.ts`, effects in `apps/web/app/components/ambient`, templates in `packages/domain/catalogue`.

Security and privacy note: no network access for themes; nothing reaches the relay beyond the theme id.
