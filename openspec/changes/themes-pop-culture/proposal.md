# Proposal

## Why

Themes make retros memorable and are a reason teams come back. Teams love the moods of famous sagas (space opera, pirates, wizard schools, street racing, creature collecting, animation studios, fantasy kingdoms, open-world crime cities). We can capture those moods without using anyone's intellectual property.

## What Changes

- 8 new original "genre" themes: Galactic (space opera), Buccaneer (pirates), Spellbook (wizard school), Night Race (street racing), Pocket Critters (creature collecting, original creatures), Studio Lamp (animation studio), Kingdoms (medieval fantasy), Neon City (open-world crime city, sunset palette).
- Each has: palette (light and dark), fonts (SIL OFL only), ambient effect (CSS/SVG, reduced-motion aware), note texture, themed timer rings, column templates in fr and en with genre vocabulary.
- An IP checklist enforced in review: no franchise names, logos, characters, symbols, quotes, music, fonts or recognisable designs; original art only; names checked against trademark databases before release.
- Owner picks the final list after seeing previews; "what works in 2026" is checked with current search trends at that time.

Out of scope: licensed themes (would need agreements).

Bounded contexts: Themes. No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `themes`: genre themes and the IP rule.

## Impact

- packages/themes: 8 theme definitions, OFL fonts (bundled, no remote fonts), contrast tests; apps/web ambient effects; templates.
