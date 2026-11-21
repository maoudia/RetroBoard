# Before: the Scrum Poker start page and deck input as they are today

Screenshots of release 1.67.0 (commit `f45f547f`, `apps/web/app/pages/poker/index.vue`, `apps/web/app/components/poker/PokerCard.vue` and `PokerHand.vue`), taken on 2026-11-21 from the generated site served by `wrangler dev` (the Worker and the real relay), in English (and French where named), theme Studio. They are the evidence behind the defect table E1 to E13 in `design.md`; nothing here is a target. A browser script (Playwright, Chromium) drove it; it is a throwaway and is not part of the repository. Light and dark use the device setting `variant: system` and `emulateMedia`.

`<screen>` is `phone` (390x844, device pixel ratio 2, touch), `tablet` (768x1024) or `desktop` (1280x800). The hand shots are taken at 390x664, the height of a phone browser between its bars.

| Name | What it shows | Defect |
|---|---|---|
| `<screen>-start-<light\|dark>` | the start page as it opens: five text pills, then the deck as round chips, "Card colours", a privacy line, "Create the room" | E5, E6 |
| `<screen>-start-tshirt-light` | T-shirt chosen: XS, S, M, L, XL, XXL and ? as round chips the shape of buttons | E6 |
| `<screen>-start-custom-light` | Custom chosen: the text field "Your cards, separated by commas" | E1 |
| `<screen>-start-custom-duplicate-light` | the list `1, 2, 4, 4, 8, ?`: one red sentence, "Two cards are the same.", the create button pale, and no chips (the picture of the deck is gone) | E2, E3 |
| `<screen>-start-custom-toolong-light` | the list `S, M, L, extra-large, ?`: "A card is 6 characters at most, with no control character." | E2, E3 |
| `phone-fr-start-custom-duplicate-light` | the same refusal in French | E2, E4 |
| `phone-hand-fibonacci-light`, `-dark` | the hand of the Fibonacci deck in a room: identical white cards, the corner copies, the coffee cup drawn by the system's colour emoji with two small cups as corners | E7, E8 |
| `phone-hand-tshirt-light`, `phone-hand-powers-light` | the hands of two other presets: the same card, only the label changes | E7 |
| `phone-hand-custom20-light` | a 20-card typed deck: one sideways row, seven cards and the cut eighth | E10 |

E4 (a French decimal comma) and E11 to E13 (every theme shares one back, a custom deck is retyped in every room, nothing in the room changes the deck) are read from the code, not shown: `splitCards` in `packages/application/src/estimation/decks.ts` splits on every comma, so `0,5, 1, 2` is the four cards `0`, `5`, `1`, `2`; `PokerCard.vue` has one `.back` rule for every theme; the typed deck lives in `sessionStorage` under `retroboard:poker:deck:<room>`; `settleRoom` in `client.ts` writes the deck once, before round 1.

## Measurements

| Shot | Viewport | What was measured |
|---|---|---|
| `phone-start-light` | 390x844 | the deck decision is two rows of text pills and a row of round chips (read from the screenshot), and no picture of a card appears anywhere on the page |
| `phone-hand-fibonacci-light` | 390x664 | 13 cards in two rows of 7 and 6, each 46x64; 11 of the 13 differ only by their number |
| `phone-hand-custom20-light` | 390x664 | one row of cards of which seven and a part are visible |
