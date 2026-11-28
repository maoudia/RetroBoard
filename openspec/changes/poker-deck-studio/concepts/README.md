# Concepts: the deck families, the special cards, the skins and the gallery

Sketches of the ideas of `design.md` (S2 to S6), drawn on 2026-11-21 from the rules written there by a throwaway script that is not part of the repository (the rules in `design.md` are the contract; these files are only there so that the owner can judge the idea before any component exists). The sheets use the real token values of the themes (`packages/themes/src`) as literal colours, because a standalone SVG has no CSS variables; in the product every colour is a token.

| File | What it shows |
|---|---|
| `decks-light.webp`, `decks-dark.webp` (and the `.svg`) | The seven families, six cards of each deck at 92%, then the same cards at 46 px and at 36 px wide, the sizes of the hand and of a seat, in Studio light and dark |
| `special-cards.webp` | The four special cards and the retired cup, with what each says and how the results count it |
| `skins.webp` | The nine card skins: a back, a face (Fibonacci 8 in the Spiral look) and the Split it card, each in the native colours of its theme |
| `gallery-fan.webp` | The gallery: the hero fan of the chosen deck (the cards at positions 0, 3, 5, 8 and 10 of the Fibonacci scale), the tiles with a small fan each, the chosen tile with its ring and check, and the plus tile |

## What the sketches already tell us

- **The idea reads.** Bigger looks bigger in every family at hand size: the tiling grows, the cairn rises, the grid fills, the shirt grows, the skyline climbs, the sand falls, the target sharpens. Greyscale loses nothing because the label is on every card.
- **Where the rules need the small-size fallback of `design.md` S3.** At 36 px (a seat) Doubles shows only a faint grid and its filled cells become a thin line; Focus at rank 2 is a faint dotted circle; Spiral's inner squares merge into the frame (the sketch already drops squares under 8 units at that size, which is the rule). Task 1.2 decides, at the screenshot review, whether each family keeps its picture at 36 px or falls back to the plain look on a seat. The label is unaffected either way.
- **Corner values.** The sketches draw them at every width for comparison; the design shows them only from 56 px, so the 46 px and 36 px cards here are the sketches without them.
- **The skins are told apart at a glance** (lattice, grid, hatch, rules, ring, web, snow, circuit, petals), but two things need the contrast spec of task 1.3: the Minimal ring is a quiet pattern on a pale field (the two tones must reach 3:1), and the Noel snow's second tone (`--accent2` yellow) must keep its edge against the surface in the light variant of Noel.
- **The gallery fan** is five cards from one pivot; with the 40% overlap the first card is mostly hidden, which is intended (the last and the middle are the ones that say how far the deck goes).

The rotated corner value at the bottom right of a card reads upside down by design (as on a playing card); in the sketches of the largest numbers it can touch the card's edge (`89`, `XXL`), which the real component avoids by sizing the corner from the card width.
