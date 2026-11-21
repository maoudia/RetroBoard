# Design

Design first: this change writes the cards, the decks and the way a deck is chosen and made down, with the evidence for it, before anyone changes a component. The room already works (sealed ballots, the real relay, the shared ledger, the one-viewport phone room of `poker-design-v2`); what is wrong is that a deck is a line of text and a card is a number in a box. Everything below is checked against `docs/design-system.md` and the screens that exist, so the cards look like the same product in nine themes.

Sequence: this change comes after group 6 of `poker-design-v2` (being finished by another worker) and before `poker-in-retroboard` and `board-estimation-phase`, which reuse its cards, skins and gallery; it stays inside the standalone poker.

Evidence: `before/` holds 24 screenshots of release 1.67.0 (commit `f45f547f`, English and French, theme Studio, light and dark, phone 390x844, tablet 768x1024, desktop 1280x800; start page, Custom with a typed list, a refused list, T-shirt, and the hand in a room for four decks), taken on 2026-11-21 from the generated site served by `wrangler dev`. `before/README.md` says how. `concepts/` holds the drawings of the deck families this design proposes (S3), made from the rules below by a throwaway script; they are sketches to judge the idea, not the final art, which is tuned at the screenshot review of task 1.2.

## What the owner sees today

`/poker`, "Custom" chosen (`before/phone-start-custom-light.webp`): a text box under "Your cards, separated by commas". The five deck names are text pills. After the box, "Card colours" and a privacy line. In a room (`before/phone-hand-fibonacci-light.webp`) the hand is a row of identical white cards, a number large and the same number twice in the corners, ending with a coffee cup drawn by the system's colour emoji.

## Defects

Measured on the generated site of release 1.67.0 and read in the code. "Fix" names the decision (S) of this design that removes it.

| # | What (evidence) | Why it hurts | Fix |
|---|---|---|---|
| E1 | The only way to define a deck is a comma-separated text field (`phone-start-custom-light`, `desktop-start-custom-light`; `index.vue` `typed`, `splitCards`) | A deck is a visual thing made in a text box, in the one place where a person is least likely to be careful; no card is shown while typing | S7: a builder made of cards |
| E2 | A refused list gets one sentence under the box: "Two cards are the same." (`phone-start-custom-duplicate-light`), "A card is 6 characters at most, with no control character." (`desktop-start-custom-toolong-light`); `phone-fr-start-custom-duplicate-light` in French | It does not say which card is wrong or what to do; "control character" is a developer's word; the person must find the card in the text | S7: the problem is said in words, names the card and is pointed at on it |
| E3 | The round chips that show the deck vanish while the list is invalid (`v-if="deck.ok"`; absent in `phone-start-custom-duplicate-light`) | The picture of the deck goes exactly when a person needs it to find the mistake | S7: the deck strip is always shown, problem cards outlined |
| E4 | A French decimal comma breaks the deck: `0,5, 1, 2` is read as the four cards `0`, `5`, `1`, `2` (`splitCards` splits on every comma) | In a French-first product the natural way to write a half is a silent wrong deck, with no error | S7: one input per card, so a comma is a character and not a separator; the list import (S7) names the separators it accepts |
| E5 | The five decks are text pills, "Fibonacci", "Modified Fibonacci", "T-shirt", "Powers of 2", "Custom" (`phone-start-light`) | Nothing says what a deck is for or looks like; the first card a person sees is in a room | S6: a gallery of fans of real cards |
| E6 | The chosen deck is shown as round chips (`phone-start-tshirt-light`: XS, S, M, L, XL, XXL, ? as circles the size of buttons) | They are shaped like the pill buttons above them, not like cards, and they say nothing about the scale | S6: the deck is a fan of cards |
| E7 | Every card is the same white rectangle with a number and two corner copies, in every deck (`phone-hand-fibonacci-light`, `phone-hand-tshirt-light`, `phone-hand-powers-light`) | Nothing in the 55 says it is bigger than the 5; the card communicates nothing the label does not | S2, S3: the card draws where it sits on the scale |
| E8 | The coffee card is the system's colour emoji with two small cups as corners (`phone-hand-fibonacci-light`) | It is the one card that ignores the theme, it differs by platform and it means "I need a break", which is not an estimate | S4: dropped, with reasons |
| E9 | The only special card is `?`; there is no card for "too big, split it", "I do not take part" or "we know this one" (`decks.ts`: `isSpecialCard` is `?`, the cup and the infinity sign) | The things that need saying are said aloud, which is what a sealed ballot is meant to prevent | S4: four special cards with a meaning each |
| E10 | A deck of 20 cards is one sideways row that shows seven cards and cuts the eighth (`phone-hand-custom20-light`) | Nothing says how many cards there are or that the row moves | S1, task 1.2: the scale wraps up to 14 cards; the rule counts the scale only |
| E11 | The nine themes share one back, a lattice in `--accent` (`PokerCard.vue` `.back`), and one face | Nine themes, one card; the open point of `poker-design-v2` K11 ("two backs may look alike") is true by construction | S5: card skins by theme |
| E12 | A custom deck is typed again in every room: it is kept only in the tab (`sessionStorage` key `retroboard:poker:deck:<room>`), there is no team default | The people who need a custom deck are the ones who play every week | S8: decks saved in the local team space |
| E13 | The deck is written once, before round 1 (`settleRoom`), and nothing in the room changes it | A wrong deck means a new room and a new link | S8: a deck switch between rounds, by the moderator |

What is right and stays: sealed ballots, the hand as a radio group, the typed names of cards (`5`, `1` then `3`, `?`), the one-viewport phone room, the `?` card, a deck of 2 to 24 cards of at most 6 characters (the domain's `isValidDeck`, so every replica judges a deck the same way), and the "Card colours" section of `poker-design-v2` 5.3.

## Principles and the rules they become

| Principle | Rule (S = decision below) |
|---|---|
| The card says where it sits | A card has a picture zone and a label zone; the picture is drawn from the card's place on the scale and the deck's look (S2) |
| A picture never carries information alone | The label is always on the card and is the accessible name; the picture only repeats it, so greyscale, forced colours and a screen reader lose nothing (S2) |
| Original, not copied | No suit, no joker, no coffee cup, no franchise art: seven drawing grammars made for this product from numbers (S3) |
| One scale, a few words beside it | A deck is scale cards plus special cards with a defined meaning (S1, S4) |
| A deck is made of cards | No text field defines a deck; a list can be pasted only as an advanced import (S7) |
| Tap to choose | The gallery is a radio group of fans; one press creates the room (S6) |
| Same product | Pill buttons, `--fs-*` `--r-*` `--sp-*` tokens, Lucide icons at the left of labelled buttons, `BaseDialog` for sheets, `Dropdown` for menus (S6, S7) |
| Themes are token sets | Nine card skins in the poker UI layer; no theme file changes; a theme without a skin fails a test (S5) |
| Calm motion | A fan settles in 280 ms, a card lifts in 150 ms, nothing moves under reduced motion (S6) |
| Everyone can use it | WCAG 2.2 AA in nine themes and both variants, 44 px targets, a keyboard and touch path for everything a drag does (WCAG 2.5.7), fr and en, overflow-safe (S9) |
| Phone first | 390x664 and 360x640 are the reference viewports; the builder is a full-height sheet on a phone (S7) |

## Decisions

### S1. A deck is a scale plus special cards

A deck is an ordered list of at most 24 cards. Its **scale cards** are the cards that say how big something is (`0`, `1`, `2`, `3`, `5`, `XL`, `2d`); its **special cards** are the cards that say something else (`?`, `~pass`, `~split`, `~known`). The wire is unchanged: `settings.update { deck: string[] }` carries labels, `isValidDeck` judges them (2 to 24 different cards of 1 to 6 characters, no comma, no control character, no padding space), and the frozen deck of a round is `Round.deck`.

A special card is a label with a reserved shape: `?` (kept) and `~` followed by a word (`~pass`, `~split`, `~known`), which fits the 6 characters. An older client that does not know them shows the text `~split` on a plain card: it degrades, it does not break, and it votes by index like any other. The cup (U+2615) of rooms made before this change is still recognised so that those rooms keep working; it is drawn by the same special-card family as "Break (retired)" and is never offered again (S4).

A **look** is how the scale is drawn: `plain`, `spiral`, `cairn`, `doubles`, `tee`, `peaks`, `hourglass` or `focus` (S3). A look is a property of the deck for a round, not of a card, so one deck has one look. The look is not on the deck wire (see S10 for why): it travels in its own command.

### S2. The picture shows where the card sits on the scale

A card of a scale is drawn from its **rank**: its index among the scale cards, from 0 to N-1, and `t = rank / (N - 1)` (`t = 0` for a deck of one scale card). The look turns `t`, and for two looks the value, into a picture:

- The label stays the truth. The picture is a second way to read "this is bigger than that", never the only one. A deck whose labels are not on a regular scale (a custom `1, 2, 4, 5, 20`) is drawn by rank, so its pictures grow evenly and its labels say what they say. That is deliberate: the picture shows order, the label shows value.
- `spiral` and `doubles` use the value when the label is a Fibonacci number or a power of two, and the rank otherwise (the term `F(rank + 1)`, or `2^rank`), so any deck can wear any look.
- A picture is decorative (`aria-hidden`), drawn in `currentColor` and two tokens (`--text` for strokes, `--accent` for the one emphasised part; `--muted` for empty parts), with no hard-coded colour and no `style` attribute (CSP). Under `forced-colors` it is a single colour (`CanvasText`).
- A person can turn the pictures off for themselves ("Plain cards", a personal setting, task 1.4): every deck then wears the `plain` look on their screen only. The room, the deck and what others see do not change.

Face layout, by the width of the card (a container query, as the corners are today):

| Card width | Layout |
|---|---|
| under 56 px (hand on a phone 46, seat 36, fan tile 30) | picture zone over the top 55%, label zone below it (the value, `--fluid-xl` for one or two characters), no corner values |
| 56 px and over (tablet 60, laptop 72, wide 80, builder 120) | the same two zones, the small corner values (top left, and bottom right turned 180 degrees), the picture zone 58% |
| special card, any width | the glyph alone, centred, filling the face; no label zone (the word is the accessible name, the tooltip and the caption, S4) |

The two zones never overlap, so the label keeps 4.5:1 of `--text` on `--surface` whatever the picture is (text is not drawn over lines). The edge of a card is 3:1 of `--muted` against the page, as in `poker-design-v2` K4.

### S3. Seven deck families

Each family is a drawing grammar (a small pure function from `t`, the value or the rank, and a box to a few path strings) in `apps/web/app/poker/glyphs.ts`, rendered by `PokerGlyph.vue` as one inline `<svg>` whose parts are `<path>` elements with classes. Nothing is stored as an image: the largest family is about 40 numbers of geometry, so the seven together stay under 4 kB gzip (budget in S12). The drawings in `concepts/` follow these rules.

| Look (deck) | Scale and labels | What the picture is | Rule from `t` (or value) | At 30-46 px | Accessible name of a card |
|---|---|---|---|---|---|
| **Spiral** (Fibonacci) | `0 1 2 3 5 8 13 21 34 55 89` | The golden tiling: squares of sizes 1, 1, 2, 3, 5, ... laid round a corner, with the quarter-circle spiral through them in `--accent`. The card shows the tiling up to its own number, the last square tinted: each card is made of the two before it, and the growth is the picture | Value `0`: one dot. Value `v` Fibonacci: the squares up to size `v`; fit the tiling to the box so the last square is the largest. A square under 3% of the box is not drawn (the arc continues) | The last three squares and the arc; the earlier squares merge into the frame | the label ("13") |
| **Cairn** (modified Fibonacci) | `0 1/2 1 2 3 5 8 13 20 40 100` | A pile of stones, flat ellipses, wider at the bottom. The pile gets taller, the stones heavier; the last stone placed is tinted. The "weight" of the number | Stones `s = 1 + floor(6 * t)` (1 to 7), bottom stone widest and each next 14% narrower; `1/2` is a half stone (a semi-ellipse); `0` is the ground line alone | Up to 4 stones are distinct; beyond, a stack with the last stone tinted | the label ("20") |
| **Doubles** (powers of 2) | `1 2 4 8 16 32 64` | An 8 x 8 grid of cells; the card fills as many cells as its value, from the bottom left, row by row. Twice the value, twice the filled area: doubling is the picture | Value `v` (a power of two up to 64) fills `v` cells in `--accent`; empty cells are outlines in `--muted`. By rank, `2^rank` cells | Empty cells merge into one frame; filled cells stay | the label ("16") |
| **Tee** (T-shirt) | `XS S M L XL XXL` | One T-shirt silhouette that grows: a bigger body and longer sleeves, centred in the box, tinted body, an outline collar. XXL's sleeves touch the edge of the card | Scale `0.42 + 0.58 * t` of the box; sleeves `0.6 + 0.8 * t` of their base length | The same silhouette without the collar line | "XL" read as the label; the word "extra large" is added by the deck's description, not by the card |
| **Peaks** (complexity) | `1 2 3 4 5` | A skyline: a ridge of peaks whose height and number grow; the highest peak has a snow cap from `t = 0.5`; the easiest card is a rounded hill | Height `0.25 + 0.75 * t` of the box; peaks `1 + floor(2 * t)` (1, 2, 3); fixed offsets from a table, so the same card is the same picture everywhere | One ridge line, no snow cap | the label ("3") |
| **Hourglass** (time) | `1h 2h 4h 1d 2d 3d 1w 2w` | An hourglass; the sand in the lower bulb is the share of the scale this card stands for, the upper bulb holds the rest, a thin stream runs until the last card, where all the sand is down | Lower sand `(rank + 1) / N` of the bulb; the stream is hidden for `t = 1` | The outline and one sand level line | "2d" (the labels are the words of the unit: `h`, `d`, `w`) |
| **Focus** (confidence) | `1 2 3 4 5` | A target made of three rings. At 1 the rings are scattered, dashed and off-centre; at 5 they are crisp, concentric, with a filled centre: how sure we are is how sharp the picture is | Offset amplitude `0.35 * (1 - t)` of the box along fixed unit vectors; rings dashed under `t = 0.34`; the centre dot in `--accent` at `t = 1` | Two rings, offset by rank | the label ("4") |

`plain` is the eighth look: the label alone, centred and large, as today. It is the look of a custom deck until the person picks another, because a look that does not fit the labels would only decorate them.

Presets, in the order of the gallery (the first is chosen):

| Deck | Look | Scale | Special cards | For |
|---|---|---|---|---|
| Fibonacci | Spiral | `0 1 2 3 5 8 13 21 34 55 89` | `?` `~split` | Relative size where the gaps widen because certainty falls: the classic |
| Modified Fibonacci | Cairn | `0 1/2 1 2 3 5 8 13 20 40 100` | `?` `~split` | The same, with the big jumps teams actually use above 13 |
| T-shirt | Tee | `XS S M L XL XXL` | `?` `~split` | Early, rough sizing of a backlog before anyone talks numbers |
| Powers of 2 | Doubles | `1 2 4 8 16 32 64` | `?` `~split` | When each step really is twice the effort |
| Complexity | Peaks | `1 2 3 4 5` | `?` `~pass` | How hard, not how long: unknowns, risk, coordination |
| Time | Hourglass | `1h 2h 4h 1d 2d 3d 1w 2w` | `?` `~split` | A team that wants hours and days |
| Confidence | Focus | `1 2 3 4 5` | `~pass` | How sure are we of the plan, of a date, of a decision (the same 1 to 5 as the ROTI vote of a retro) |

A moderator can add `~pass` or `~known` to any preset, and remove `~split`, with the four toggles of "Special cards" (S6); the deck then becomes a custom variant ("Fibonacci + Pass") that is not saved unless asked. A time deck is an ordinal deck for the statistics (its labels are not plain numbers, `isNumericDeck`): the median is a card and there is no average, which is right for "2d" and "1w".

### S4. Special cards: what they are for, and why the coffee cup goes

Four cards, each a vote with a meaning the room can act on. They are counted in the results by the rule in the last column (task 2.2); a number-like value is never made of them.

| Card | Label on the wire | Glyph | Says | What the room does with it |
|---|---|---|---|---|
| Need more information | `?` (kept) | A bold question mark whose dot is a filled `--accent` circle | "I cannot estimate this yet: something is unclear" | Counted in `signals.info` and in `cast`; kept out of the numbers (as today). The results add a line with the names ("Need more information: Ann, Bob"). When most of the cards cast are this one, the verdict is "Needs more information" and Vote again is the filled button after the clarification |
| Pass | `~pass` | A card sliding out of a dashed frame, with a short arrow | "I take no part in this one: it is not mine to size" | Counted as present (it is a ballot, so the auto-reveal does not wait for it) but not in `cast`: it is not an estimate, so it changes no consensus share. Listed muted ("Passed: Eli") and drawn in the distribution as a column with its count |
| Split it | `~split` | A block cut in two by a zigzag crack, the halves a little apart | "This is too big for one story: break it up" | Counted in `signals.split` and `cast`, kept out of the numbers. A line names who played it. When at least half of the cards cast are this one, the verdict is "Most say: split it", "Use 5" is not offered and, once stories exist (`scrum-poker` task 4.1), the moderator can mark the story "to split" |
| Already known | `~known` | A check mark inside a stamp ring | "We know this one: it is done, or it is the same as one we sized" | Counted in `signals.known` and `cast`, kept out of the numbers. Same rule as Split: at half or more of the cards cast, the verdict is "Most say: already known" and the story can be closed without an estimate |

Why a card each, and not one "other" card: each answers a different question, and each leads to a different next step (clarify, re-vote without them, split, close). "Pass" is not "?" (an unsure person is information for the room; a person with no stake is not), and "Split it" is not a large number (a 100 says the work is big, "Split it" says the story is wrong).

**Why the coffee card is dropped.** Four reasons, in order of weight:
1. It is not a vote. "I need a break" is a request to the room, and the person who answers it is the moderator, who has the room's timer (`poker-in-retroboard` reuses the shared countdown for a break). A card inside a sealed ballot hides the request until the reveal, which is when a break is least useful.
2. It does not look like the rest. It is the one card drawn by the operating system's colour emoji, so it ignores the theme and the glyph family, its name changes by platform, and its two corner marks are smaller copies of a picture that is not a value (`before/phone-hand-fibonacci-light.webp`).
3. It is inherited, not chosen. It is on the cards of other tools because it is on physical decks; no one on the team plays it as an estimate.
4. The need it hints at (I am lost, I am out of this) is better served by `?` and Pass, which the results can use.

A room made before this change keeps its cup: it is drawn by the special-card family and named "Break (retired)", still counted as a card that is not a number. It is never offered in a preset, in the builder or in the special-card toggles.

Names, short words and icons for the results lines are text in fr and en (`poker.special.*`, written in task 2.2): "Besoin d'infos / Need more information", "Passer / Pass", "A decouper / Split it", "Deja connu / Already known" (accents are set in the strings file; the spec text is ASCII).

The keys: only `?` is a typed name. The other three are reached by the arrow keys and Tab (a typed `s` already means the size S, so a typed word for Split would make every S wait 700 ms).

### S5. Each theme restyles the card face and the back

A **card skin** is a record in `apps/web/app/poker/skins.ts` (the UI layer, not the themes package, so no `ThemeDefinition` field is added and the rule of `poker-design-v2` K11 holds), keyed by the theme id, applied to every `PokerCard` through `[data-theme="..."]` custom properties and a few selectors in the component CSS:

```
interface CardSkin {
  edge: 'solid' | 'double' | 'stitch'      // the face's border: one line, two, or dashes sewn inside
  corner: number | 'cut'                   // a factor of --r-card, or chamfered corners
  back: 'lattice' | 'grid' | 'hatch' | 'rules' | 'ring' | 'web' | 'snow' | 'circuit' | 'petals'
  tint: number                             // 0 to 12: percent of --accent mixed into the face
  stroke: 'round' | 'square'               // the line cap and join of every glyph
}
```

| Theme | Edge | Corner | Back (made of `--accent`, `--accent2` and `--surface` only) | Tint | Stroke |
|---|---|---|---|---|---|
| Studio | solid | 1 | diamond lattice (what ships today) | 0 | round |
| Corporate | solid | 0.4 | a fine square grid | 0 | square |
| Slate | solid | 0.8 | one-direction hatch | 4 | square |
| Paper | stitch | 1 | notebook rules and a margin line | 6 | round |
| Minimal | solid | 0.3 | one centred ring on a flat field | 0 | round |
| Halloween | double | 1 | a spider web: concentric arcs crossed by rays | 0 | round |
| Noel | double | 1 | a field of snow: staggered dots | 0 | round |
| Cyber | solid | cut | a circuit: crossing hairlines with dotted joints | 3 | square |
| Sakura | solid | 1.4 | petals: staggered rounded dots in `--accent2` | 5 | round |

Rules, each with a test (task 1.3 and 6.1):
- **Every theme in `THEMES` has a skin.** A unit test iterates the themes package, so the eight genre themes of `themes-pop-culture` cannot ship without one, and a new theme fails the build until its card exists.
- **Contrast stays.** Face edge and empty-slot edge are 3:1 against the page and the surface, the label is 4.5:1, a back's two tones are told apart at 3:1, in the nine themes and both variants (the spec modelled on `tests/e2e/contrast-themes.spec.ts`). A skin that fails is adjusted in its own record, never in a theme file.
- **No second source of colour.** A skin may only use theme tokens; a hard-coded hex is refused by `design-tokens.test.ts`, as for every component.
- **The hue of "Card colours" still wins on the back** (`--poker-back`, `poker-design-v2` 5.3): a moderator's hue replaces the colour of the pattern, not the pattern.
- **Forced colours** drop patterns to a single `CanvasText` edge and a faint hatch, as today.

Until the room's own theme is imposed on everybody (`poker-in-retroboard` group 1), a person sees the skin of their device's theme.

### S6. The gallery: a fan of real cards, tap to choose

The start page's deck decision is one gallery. Its parts:

- **The hero fan** shows the chosen deck: five real cards (the first, a quarter of the way, the middle, three quarters, the last scale card; `round(i * (N-1) / 4)`), tilted -20, -10, 0, 10 and 20 degrees about a point below the middle card, overlapping by 40%, the middle one on top, drawn by the same `PokerCard` in the skin of the theme. Under it: the deck's name (`--fs-xl`), one line of purpose (muted), and a facts line ("11 cards, ? and Split it"). 64x90 px cards on a phone, 80x112 on a tablet, 96x134 on a laptop and wider.
- **Deck tiles** are the choice: each a small fan of three cards (the first, the middle, the last; -12, 0, 12 degrees, 30x42 px), the name on one line (`--fs-sm`, ellipsis, the full name as the accessible name) and the card count. A tile is at least 96x104 px (a 44 px target by far). Chosen: a 3 px ring in `--accent` with a 2 px offset, a check badge in the top corner and the fan lifted 6 px (shape, not only colour), as the hand's chosen card.
- **The plus tile** "Make your own" ends the row: a dashed edge, a plus icon, the same size as a tile; it opens the builder (S7).
- **Special cards** is a collapsed section under the hero with four toggles (the four glyph cards with their words), so a moderator adds Pass or Already known, or removes Split it, without entering the builder. "Card colours" (`poker-design-v2` 5.3) stays below it.
- A phone shows the tiles as one snapping row with the next tile peeking; from 600 px they wrap in a grid (4 columns on a tablet, the right-hand column of the hero on a laptop).
- It is a **radio group**: each tile is a `label` with a native radio (screen-reader-only), `aria-label` "Fibonacci, 11 cards, 0 to 89, plus Need more information and Split it", arrows move and choose, Tab leaves the group; the plus tile is a button after the group. The hero is not interactive except "See all cards" (a link-styled button), which opens the deck sheet listing every card with the meaning of the special ones.
- **Motion.** Choosing a tile re-deals the hero fan: each card eases to its angle over 280 ms (staggered 10 ms, at most 60 ms in all, like the reveal); the lift of the chosen tile is 150 ms; under reduced motion (system or application setting) nothing moves, the new fan is simply there.
- **Team decks.** A team's saved decks (S8) are tiles in the same row after the presets, with the team's emoji as a small badge; the "All decks" sheet (opened from "See all decks" on a tablet and wider, and by the in-room switch) lists the team's decks first.

### S7. The deck builder: cards you add, edit, move and remove

Opened by the plus tile. A full-height sheet on a phone (a `BaseDialog` the height of the dynamic viewport), a 720 px dialog from 600 px. It edits a copy: nothing changes until "Use this deck".

```
header:   [x]  Your deck            [name field]            [ ... ]  (Import a list...)
preview:  the selected card, large, live: face (and the back, with a Face | Back toggle),
          its label is a real input in the middle of the card
tools:    [ <- Earlier ] [ Later -> ] [ trash Remove ]
strip:    the scale as mini-cards (44x62) in a wrapping listbox, then the plus tile "+ 21"
specials: [?] [Pass] [Split it] [Already known]   four toggles
looks:    Plain  Spiral  Cairn  Doubles  Tee  Peaks  Hourglass  Focus   (radio tiles with a mini card)
problems: the sentence(s), in words, under the strip
footer:   [ ] Save to my team's decks               [ Use this deck ]  (filled)
```

- **Add.** The plus tile reads "+ 21": it proposes the next card from the last numbers (`suggestNext`: `+d` for an arithmetic run, `x r` for a geometric one, `a + b` for a Fibonacci run, `+1` for a single number, nothing for words, where the tile reads "+" alone). Pressing it appends that card, selects it and puts the cursor in its label, in the preview. A new card is never empty by default and never a duplicate: when the suggestion is taken, the next one is proposed.
- **Edit in place.** The label is typed on the live preview, in the large value of the card (a real `<input>` styled as the value, `aria-label` "Label of card 4 of 11", 6 characters at most, `maxlength` 6). The strip card updates as the person types. Enter ends the edit and moves to the next card; Escape returns to the strip.
- **Reorder.** Three ways, all always available: dragging a card in the strip (a mouse drag; a long press of 350 ms on touch, the existing `useTouchDrag` behaviour, 8 px slop, edge scrolling), the keys (with a card selected, `Alt+ArrowLeft` / `Alt+ArrowRight` move it one place; `Home` and `End` with `Alt` move it to the ends), and the "Earlier" and "Later" buttons for pointer and screen-reader users (WCAG 2.5.7: nothing needs dragging). Each move is announced politely ("5 moved to position 2 of 11").
- **Remove.** The "Remove" button and the `Delete` key; the card goes, the next one is selected, and an "Undo" toast-free line ("Removed 13. Undo") stays under the strip for 8 seconds (a button, the same deck restored). A deck cannot go under 2 cards (the button says why).
- **Special cards.** Four toggles after the strip, each a small card with its glyph and its word (a `button` with `aria-pressed`). They are not part of the reorderable strip: they always follow the scale, in a fixed order (`?`, Pass, Split it, Already known).
- **Looks.** Eight radio tiles with a mini card each, drawn with the actual labels of the deck. The preview and the strip change at once. `plain` is the default for a new custom deck; a preset opened in the builder keeps its look.
- **Limits.** 2 to 24 cards in all; 6 characters a label (the domain's `isValidDeck`; the builder never produces a list the domain refuses, and it says why when asked to).
- **Name.** An optional name of 24 characters ("Backend sizes"); without one the deck is "My deck" in the gallery.

**Problems are said in words and shown on the cards.** Each problem is one sentence that names the card and says what to do; the card gets an outline in `--danger`, a small alert icon at its corner (a shape cue, so colour is not alone) and `aria-invalid`, and the sentence is in a `role="alert"` region under the strip (polite for a deck that was valid a moment ago, once per problem). "Use this deck" stays pressable: with a problem, it moves the focus to the first problem card instead of being disabled with no reason.

| Problem | Sentence (en; fr is written with it) | Shown on |
|---|---|---|
| fewer than 2 cards | "A deck needs at least 2 cards. Add one more." | the plus tile |
| more than 24 | "A deck holds 24 cards at most. Remove 2." | the last cards over the limit |
| empty label | "Card 4 is empty. Type its value, or remove it." | the card |
| longer than 6 | "'extra-large' is 11 characters. A card holds 6 at most." | the card |
| duplicate | "Two cards say 5. Each card needs its own name." | both cards |
| comma or control character | "A card cannot contain a comma." | the card |
| a reserved word typed by hand (`~split`) | "'~split' is a special card. Add it from Special cards." | the card |

The domain stays the judge: the builder builds from per-card inputs and calls `validateDeck(cards)`, which returns every problem (kind, the cards) and which the builder's messages are written from; the check of `isValidDeck` still runs on every replica and refuses what it must.

**Import a list (advanced).** A menu item "Import a list..." in the header menu opens a small dialog: a text area labelled "One card per line, or separated by commas, semicolons or tabs", the parsed cards shown live as mini-cards and the problems listed per card, and two buttons, "Replace the deck" (filled) and "Add to the deck" (quiet). Splitting is on newline, tab and semicolon first; commas split only when the text has no newline, tab or semicolon (so a French `0,5` pasted on its own line stays one card, and `1, 2, 3` on one line is three; a paste with both is split on the stronger separators and the comma stays inside a card, which is then refused with the comma sentence). More than 24 cards are refused as a whole with the count ("30 cards found. A deck holds 24."), never cut silently. This is the only place a list of text defines cards, and there is no field for it on the start page or in the room.

Keyboard map of the builder: Tab reaches the preview label, the toolbar, the strip (one tab stop, arrows move between cards, `Enter` edits, `Delete` removes, `Alt+Arrows` move), the plus tile, the special toggles, the look group (arrows), the problems, the footer.

### S8. Saving, sharing and switching

**Local team space.** `Team.decks?: SavedDeck[]` (at most 12 per team) and `TeamDefaults.pokerDeck?: string` (the id of a saved deck or of a preset) in `packages/application/src/team/workspace.ts`. A saved deck is `{ id, name, look, cards, at }`. They live in the team's record, so they sync with it through the vault by the team's existing last-write-wins stamp (`storage/workspace-merge.ts`). The limit that follows is the one the cuts of `user-drive-storage` already name for the workspace: two devices that edit the same team's decks while apart keep the later edit and lose the other's. "Save to my team's decks" in the builder writes to the current team (`team.ensureTeam()`); a tile's menu offers Edit, Duplicate, Rename, Make default and Delete (with a `ConfirmDialog`). The start page opens with the team's default deck chosen when there is one (and creating a room remembers the deck as the team's default, as boards remember their format and theme, `TeamDefaults`).

**Shared with the room.** The moderator's choice is written into the room before round 1: the labels in `settings.update { deck }` (unchanged) and the look and name in the new command `deck.style { look, name? }` (S10). Everybody sees the same cards, in the same look, in their own theme's skin. A participant never receives a deck as a file or a link: they read it from the room. "Deck" in the room's overflow menu opens the deck sheet for everybody (the fan, every card, the meaning of the special ones) with "Save to my team's decks" for a person who wants to keep it: that writes only to their own device's team space and sends nothing.

**Switching in the room.** The same menu item is a switch for the moderator, from the lobby and between rounds: it opens the "All decks" sheet (S6) and "Use this deck" writes `settings.update { deck }` then `deck.style`, which apply from the next round (`Round.deck` is frozen when a round opens, so a round in progress is never changed under people's hands). If the current round is open and nobody has voted, the sheet offers "Start a new round with this deck" (one `round.start`); if cards are in, the button says "Applies from the next round" and the room shows nothing new until then. A voter has no switch. At most one `deck.style` and one `settings.update` per round, so the events grow by tens in a 20-voter hour at most.

### S9. Accessibility, language and small screens

- **Everything a drag or a picture does has another way** (WCAG 2.5.7, 1.1.1, 1.4.1): reorder by keys and buttons, a label on every card, problems as text and an icon as well as a colour, chosen deck by a check badge as well as a ring.
- **Targets** 44 px (48 for the primary on a phone) and 8 px apart; the strip's mini-cards are 44x62; tiles 96x104.
- **Focus order**: bar, gallery (tiles then plus tile), special toggles, colours, Create; in the builder as in the map above. `:focus-visible` rings are never removed. A sheet returns the focus to its opener.
- **Announcements**: "Fibonacci chosen. 11 cards." when a tile is chosen; "5 moved to position 2 of 11"; the problem sentences; "Removed 13. Undo", all polite and once, through the shared live regions (`useLiveAnnouncer`, which `poker-in-retroboard` makes the poker room's too).
- **Language**: every string has `fr` and `en` keys (`poker.deck.*`, `poker.builder.*`, `poker.special.*`, `poker.look.*`, `poker.gallery.*`), French the source, in the lazy poker strings file; the deck names and purposes are strings, not data, so a saved deck's own name is the only user text. `pt()` does not yet go through `pseudolocalize` (task 6.2 of `poker-design-v2` is being finished before this change starts, so task 6.2 here can rely on it); the overflow spec covers the gallery and the builder with 24-character deck names, 24 cards and `?lang=pseudo` at 360, 390, 768 and 1440 px. A card label is the person's own text and is not translated.
- **Plain cards, reduced motion, forced colours, dark**: see S2, S5, S6; every glyph and skin is checked in both variants.

### S10. Data and wire

Where each new type lives:

| Piece | Layer |
|---|---|
| `DeckLook`, `DeckDef`, the seven presets with their looks and special cards, `SPECIAL_CARDS` (token, id, word keys), `isSpecialCard` extended, `suggestNext`, `validateDeck` (every problem), `parseCardList` (the import), the `signals` and the `pass` rule of `roundStatistics` | `packages/application/src/estimation/` (pure; `decks.ts`, `statistics.ts`) |
| `deck.style { look, name? }`, `PokerState.look` and `deckName`, `Round.look` frozen at `round.start`, the privilege (moderator only), the validity (a known look, a name of at most 24 characters), replay | `packages/domain/src/estimation/poker.ts` |
| The wire body of `deck.style` and its tag in `POKER_COMMAND_TAGS` | `packages/protocol/src/poker.ts` |
| The glyph grammars, the skins, the fan geometry, the layout tiers | `apps/web/app/poker/glyphs.ts`, `skins.ts`, `card.ts` (pure; unit tests) |
| `PokerGlyph`, `PokerCard` (two zones, special faces), `DeckFan`, `DeckTile`, `DeckGallery`, `DeckBuilder`, `DeckImport`, `DeckSheet`, the start page | `apps/web/app/components/poker/`, `apps/web/app/pages/poker/` (UI only; Vue and CSS) |
| Strings fr and en | `apps/web/app/poker/strings.ts` (lazy, with the poker pages) |
| `Team.decks`, `TeamDefaults.pokerDeck`, their merge | `packages/application/src/team/workspace.ts`, `storage/workspace-merge.ts` |

**Why the look is its own command and not a field of `settings.update`.** The wire schema of `settings.update` is a strict object: a client that knows nothing of a new field refuses the whole event and keeps the old deck, and a vote is an index into the deck, so one client would read another's card as a different value. A new tag is the safe path ADR-0042 already provides: an older client keeps and forwards a poker command whose tag it does not know, does not fold it and shows plain cards. So the labels stay in `settings.update` (every client reads the same cards) and only the picture is new (`deck.style`), which an old client ignores without harm. A test proves both (task 2.3).

**Rounds.** `Round.look` is copied from the state when the round opens, as `Round.deck` is, so a look change applies from the next round and a replayed room draws every round as it was. Rounds opened before this change have no look and are `plain`.

**Statistics.** `roundStatistics` gains `signals: { info, pass, split, known }` and `cast` no longer counts `~pass` (the other special cards still count as cast, as `?` does); `counted`, the average, the median, the mode, the spread and the suggestion are unchanged. `consensus` is the top share of `cast`. The fold needs no change for the special cards: a `~split` is one more valid label of the frozen deck, and `everyoneVoted` counts a pass as a ballot.

**Team decks** are plain data in the team workspace, sealed in the device's vault like the rest of the workspace; the canary test of `user-drive-storage` (a plaintext value never reaches a target) gets a deck name as a canary.

### S11. Tokens and motion

| Need | Token |
|---|---|
| Page, surfaces | `--bg`, `--surface`, `--surface2` |
| Label, strokes of a glyph, corner values | `--text`; captions and empty parts `--muted` |
| The emphasised part of a glyph, the back's pattern, the chosen ring, the check | `--accent` with `--accent-ink` on it; a second tone `color-mix(in oklab, var(--accent) 60%, var(--surface))` |
| Problems | `--danger` for the outline plus an icon and words |
| Sizes of text | `--fs-*`, `--fluid-*`; never a literal size |
| Radii | `--r-card` times the skin's factor for cards, `999px` for buttons and chips, `50%` for avatars |
| Space | `--sp-*` |
| Motion | `--dur-fast` for the lift, the 280 ms constant of the flip for the fan, none under reduced motion |
| Elevation | `--shadow-1` for the lifted card and the chosen tile, `--shadow-2` for the sheet |

### S12. Bundle, privacy and traffic

- **Bundle.** The glyph grammars (about 4 kB gzip), the skins (1.5 kB), the gallery and the builder with the import (about 14 kB) and the new strings (about 3.5 kB) are lazy chunks of the poker pages: a budget of **24 kB gzip in all**, counted in the total budget (419.8 kB of 500 kB measured on 2026-11-21, so the new total is at most 444 kB), and **0 kB in the entry chunk**, which is at its 56.5 kB limit. The personal "Plain cards" setting is therefore stored by the poker pages themselves (their own `localStorage` key), not in `LocalSettings`, which is entry code; `poker-in-retroboard` moves it to the shared settings when the entry budget is reviewed. Task 6.3 measures both numbers and the Lighthouse budgets are unchanged (the landing page and boards load none of this).
- **Privacy.** A deck name and a card label are content typed by a person: in the room they are inside the encrypted event; on the device they are in the team workspace, sealed with the device key and in the vault; nothing about a deck is sent to us in the clear or logged. The relay sees one more envelope of five fields per deck change. No remote font, image, icon set or analytics: the pictures are generated paths. The "Import a list" text is not stored anywhere; it is parsed in memory.
- **Traffic.** One sealed event more, `deck.style`, at most one per round, and a `settings.update` when the deck changes: tens of events in a 20-voter hour of about 1,170.

### S13. Components: what is existing and what is new

The design language is RetroBoard's. Everything below is an existing component, token or composable of the product, named so that the implementation reuses it and the review can check it; only the two surfaces in the last table are new, and even those are made of existing tokens, radii, spacing, motion and themes.

| Existing, reused by name | Used for |
|---|---|
| `BaseDialog` | The builder, the import dialog, the deck sheet and the "All decks" sheet (full height on a phone, as the board's share dialog) |
| `Dropdown` (`menu`) | The builder's header menu ("Import a list..."), the tile menu (Edit, Duplicate, Rename, Make default, Delete); a bottom sheet on a phone with 48 px rows |
| `ConfirmDialog` | Deleting a saved deck |
| `ToggleSwitch` | "Save to my team's decks", "Plain cards" (the product's one on/off control) |
| `.btn`, `.btn-primary`, `.btn-ghost`, `.btn-sm` with an icon at the left of every label | Create the room, Use this deck, Earlier and Later, Remove, Replace the deck, Add to the deck, See all cards |
| `.chip` (global class of `base.css`) | The look choices when shown as text (the mini-card tiles are the new surface) |
| `.seg` (segmented control) | Face or Back in the builder preview |
| `.field` | The deck name, the card label input and the import text area |
| `LocaleSwitch`, `BetaTag`, `GuideLink`, `Icon` (Lucide) | The start page's bar and headline, the deck sheet's help link, every icon |
| `TeamSwitcher` (the team's emoji and name) | The team badge on saved decks, and the team the deck is saved to |
| `useTouchDrag` | The long-press drag of a card on touch (350 ms, 8 px slop, edge scrolling) |
| `useLiveAnnouncer` (and the poker room's `role="status"` region until `poker-in-retroboard` merges them) | "5 moved to position 2 of 11", the problem sentences, the deck chosen |
| `useToasts` | "Deck saved to your team" (a confirmation, not a state) |
| Tokens `--bg --surface --surface2 --border --text --muted --accent --accent-ink --danger`, `--fs-*`, `--fluid-*`, `--r-card`, `--sp-*`, `--dur-fast`, `--shadow-1`, `--shadow-2` | Every colour, size, radius, space, motion and elevation (S11) |
| `PokerCard` (released in `poker-design-v2` group 1) | Every card drawn in the room, the hand, the seats, the gallery and the builder |
| `PokerHand`, `PokerResults`, `CardDistribution`, `ConsensusMeter` | Changed here (the tray, the special lines); moved onto the shared charts by `poker-in-retroboard` |

| New surfaces (built from the tokens above) | What it is |
|---|---|
| `PokerGlyph` and the faces of `PokerCard` | The picture zone of a card and the special glyphs |
| `DeckFan`, `DeckTile`, `DeckGallery` | The fan of cards and the tile that chooses a deck |
| The strip, the plus tile and the preview of `DeckBuilder` | The deck made of cards, edited in place |

Where the poker UI around these uses its own look instead of the shared components today (the start page's bar and shell `PokerBar` and `PokerStep`, the overflow menu `PokerMenu`, the invite sheet, the chips of the start page), moving it onto the shared ones is a task of `poker-in-retroboard` (its component map and removal list), because it changes the whole room and not only the decks; this change adds one task (4.4) for what it touches itself.

## Wireframes

ASCII, drawn at 40 columns for a 390 px phone and 78 for the wider classes. Marks at the right of a block: `[E]` an existing component or class of the product (named in S13), `[N]` a new surface of this change. Without a mark the line is plain content. `{x}` is a card in a fan (tilted), `[x]` a flat card, `[bk]` a back, `[+]` the plus tile, `<ck>` the check badge, `<!>` the alert icon, `(o)` a radio, `(<)` back, `(...)` the overflow menu. A fan is drawn flat here; the tilt is in S6.

### Start page, phone 390 px

```
+--------------------------------------+
| (<) RetroBoard                 (EN|FR)|   [E] the poker bar, LocaleSwitch
|                                      |
|  Scrum Poker  [BETA]                 |   [E] h1, BetaTag
|  Estimate together. Nobody sees a    |   one lead line
|  card until the reveal.              |
|                                      |
|      {0} {3} {8} {34} {89}          |   [N] DeckFan: five real cards of the
|       \   \  |   /   /               |   chosen deck, 64x90, in the theme's skin
|                                      |
|  Fibonacci                           |   name (--fs-xl)
|  Each card is the two before it.     |   purpose, one line, muted
|  11 cards, ? and Split it            |   facts, muted
|                                      |
|  +------+ +------+ +------+ +---     |   [N] DeckTile row, [E] radio group, snap row
|  |{}{}{}|<ck>{}{}{}| |{}{}{}| |{}   |   the next one peeking; the chosen one has
|  |Fibon.| |Stones| |T-shirt| |Dou   |   a ring, a check and a lifted fan
|  +------+ +------+ +------+ +---     |
|  +- - - - -+                         |   [N] the plus tile
|  |   [+]   |  Make your own          |
|  +- - - - -+                         |
|                                      |
|  > Special cards     ? and Split it  |   [E] details, [N] four card toggles
|  > Card colours                      |   [E] details (poker-design-v2 5.3)
|                                      |
|  Encrypted in your browser. No acct. |   one muted line
+--------------------------------------+
|  [ (play) Create the room ]          |   [E] .btn .btn-primary, fixed foot
+--------------------------------------+
```

The page may scroll on a short phone; the button stays at the foot. Choosing a tile re-deals the hero; one press on Create makes the room with the chosen deck.

### Start page, tablet 768x1024

```
+----------------------------------------------------------------------+
| (<) RetroBoard                                              (EN | FR)|
+----------------------------------------------------------------------+
|                                                                      |
|                  Scrum Poker  [BETA]                                 |
|                  Estimate together. Nobody sees a card until         |
|                  the reveal.                                         |
|                                                                      |
|                  {0}  {3}   {8}   {34}   {89}                        |   hero fan 80x112
|                                                                      |
|                  Fibonacci - each card is the two before it          |
|                  11 cards, ? and Split it            [ See all cards]|
|                                                                      |
|                  +------+ +------+ +------+ +------+                |   tiles wrap, 4 columns
|                  |{}{}{}|<ck>|    | |{}{}{}| |{}{}{}|               |
|                  |Fibon.| |Stones| |T-shirt| |Doubles|               |
|                  +------+ +------+ +------+ +------+                |
|                  +------+ +------+ +------+ +- - - -+               |
|                  | Peaks| | Time | | Conf.| |  [+]  |               |
|                  +------+ +------+ +------+ +- - - -+               |
|                                                                      |
|                  > Special cards      > Card colours                 |
|                  Encrypted in your browser. No account.              |
|                                                                      |
|                  [ (play) Create the room ]                          |   56 px, in the flow
+----------------------------------------------------------------------+
```

### Start page, desktop 1280x800

```
+--------------------------------------------------------------------------------+
| (<) RetroBoard                                                        (EN | FR)|
+--------------------------------------------------------------------------------+
|                                                                                |
|    Scrum Poker  [BETA]                    +------+ +------+ +------+ +------+  |
|    Estimate together. Nobody sees a       |{}{}{}| |{}{}{}| |{}{}{}| |{}{}{}| |
|    card until the reveal.                 |Fibon.| |Stones| |T-shirt| |Doubles||
|                                           +------+ +------+ +------+ +------+  |
|      {0}  {3}   {8}   {34}   {89}        +------+ +------+ +------+ +- - - -+  |
|                                           | Peaks| | Time | | Conf.| |  [+]  |  |
|    Fibonacci                              +------+ +------+ +------+ +- - - -+  |
|    Each card is the two before it.        Your team's decks                      |
|    11 cards, ? and Split it               (none yet: Save to my team's decks     |
|    [ See all cards ]                       in the builder)                       |
|                                                                                |
|    > Special cards    > Card colours                                           |
|    [ (play) Create the room ]    Encrypted in your browser. No account.        |
+--------------------------------------------------------------------------------+
```

The hero is the left column, the gallery the right; the team's decks have a row of their own once there is one.

### Gallery ("All decks" sheet), phone

Opened by "See all decks" on a wide screen, by the in-room deck switch, and by "Make your own"'s neighbour tiles on a phone when the row is long.

```
+--------------------------------------+
| [x]  Decks                           |   [E] BaseDialog, full height on a phone
+--------------------------------------+
|  Your team's decks   (rocket)        |   only when the team has some
|  +--------+ +--------+               |
|  |{}{}{}  | |{}{}{}  |               |
|  |Backend | |Design  |   (...)       |   [E] Dropdown menu: Edit, Duplicate, Rename,
|  |  8 cards| | 5 cards|               |   Make default, Delete
|  +--------+ +--------+               |
|  Decks                               |
|  +--------+ +--------+               |
|  |{}{}{}<ck>|{}{}{}  |               |
|  |Fibonacci| |Modified|              |
|  |11 cards | |11 cards|              |
|  +--------+ +--------+               |
|  | T-shirt | | Powers |  ...         |
|  +- - - - -+                         |
|  |   [+]   |  Make your own           |
+--------------------------------------+
|  [ Use this deck ]                   |   in the room: "Applies from the next round"
+--------------------------------------+
```

Tablet: the same in a 4-column grid in a 720 px dialog. Desktop: 5 columns, the chosen deck's hero fan in a left column of the dialog with the list of its cards and what the special ones mean.

### Deck sheet of a deck, any size (what each card is)

```
+----------------------------------------------------------+
| [x]  Fibonacci                                           |
|  {0} {1} {2} {3} {5} {8} {13} {21} {34} {55} {89}         |  the scale, full size
|  Special cards                                           |
|  [?]  Need more information  - I cannot estimate this yet |
|  [|/] Split it               - This is too big: break it up|
|  Pass and Already known are not in this deck.            |
|  [ Save to my team's decks ]            [ Use this deck ] |
+----------------------------------------------------------+
```

### Builder, phone

```
+--------------------------------------+
| [x]  Your deck    [ Backend sizes  ] |   [E] .field
|                                 (...)|   [E] Dropdown menu: Import a list...
+--------------------------------------+
|        +--------------+              |
|        |  3        3  |              |   [N] the preview: the selected card, 120x168
|        |   /\  /\     |              |   its picture in the chosen look
|        |  /  \/  \    |              |
|        |     [ 3 ]    |              |   [N] the label is an input; [E] .seg Face | Back
|        +--------------+              |   (Face | Back)
|   [<- Earlier] [Later ->] [trash]    |
|                                      |
|  [1][2][ 3 ][5][8][13][21]           |   [N] strip of mini-cards, selected one ringed;
|  [34][+ 55]                          |   one ringed; the plus tile proposes 55
|                                      |
|  Special cards                       |
|  [?] [Pass] [Split it] [Known]       |   [N] four card toggles (aria-pressed)
|  Look                                |
|  (Plain)(Spiral)(Cairn)(Doubles)>    |   [N] radio tiles with a mini card, [E] .chip rules
|                                      |
|  <!> Two cards say 5. Each card      |   [E] live region; [N] outlined cards;
|      needs its own name.             |   the two cards outlined above
+--------------------------------------+
|  [ ] Save to my team's decks         |   [E] ToggleSwitch
|  [ Use this deck ]                   |   [E] .btn .btn-primary, fixed foot
+--------------------------------------+
```

### Builder, tablet 768x1024 (a 720 px dialog)

```
+--------------------------------------------------------------+
| [x]  Your deck           [ Backend sizes        ]       (...) |
+--------------------------------------------------------------+
|   +----------------+   [<- Earlier] [Later ->] [trash]       |
|   |  3          3  |                                         |
|   |    /\  /\      |   Special cards                         |
|   |   /  \/  \     |   [?] [Pass] [Split it] [Known]         |
|   |      [ 3 ]     |                                         |
|   |  3          3  |   Look                                  |
|   +----------------+   (Plain)(Spiral)(Cairn)(Doubles)       |
|   (Face | Back)        (Tee)(Peaks)(Hourglass)(Focus)         |
|                                                              |
|   [1][2][ 3 ][5][8][13][21][34]  [+ 55]                      |
|   <!> Two cards say 5. Each card needs its own name.         |
+--------------------------------------------------------------+
|   [ ] Save to my team's decks                [ Use this deck ]|
+--------------------------------------------------------------+
```

### Builder, desktop 1280x800 (a 720 px dialog, centred)

The same as the tablet; the preview is 160x224, the strip shows up to 12 mini-cards a row, and the keyboard hints ("Alt + arrows to move") are shown under the strip on a fine pointer.

### Import a list (advanced), any size

```
+--------------------------------------------+
| [x]  Import a list                         |
|  One card per line, or separated by        |
|  commas, semicolons or tabs.               |
|  +--------------------------------------+  |
|  | 1                                    |  |
|  | 2                                    |  |
|  | 4                                    |  |
|  | extra-large                          |  |
|  +--------------------------------------+  |
|  [1][2][4][ <!> extra-large ]              |   parsed live, the problem on the card
|  <!> 'extra-large' is 11 characters.       |
|      A card holds 6 at most.               |
|  [ Replace the deck ]   [ Add to the deck ]|
+--------------------------------------------+
```

### The hand with special cards, phone 390x664 (voting)

```
+--------------------------------------+
| (<) Round 2                  (+) (...)|
|     2 of 6 voted                     |
+--------------------------------------+
|  ... seats ...                       |
+--------------------------------------+
|  [ (eye) Reveal ]                    |
|  [0][1][2][3][5][8][13]              |   scale: 7 + 4, the picture on top of
|  [21][34][55][89] | [?][|/]          |   each label; then a divider and the
|                                      |   special cards (glyph alone, accent)
|  You played: Need more information   |   the one hint line: the caption of
+--------------------------------------+   the chosen special card (touch)
```

Thirteen cards wrap in the two rows of `poker-design-v2`; a deck with all four special cards is three rows and uses the slack of the budget (84 px at 390x664, 60 px at 360x640). On a fine pointer the line under the hand shows the caption of the hovered or focused special card, and the keyboard hint otherwise.

## What this replaces once it is implemented

This change is an additive follow-up (owner decision of 2026-11-21): `poker-design-v2` and `scrum-poker` describe what is built and released, and their text is not rewritten by this change. What follows is what each task of this change replaces when it is implemented, so that nobody reads the older text as current after that. The pull request of the task that implements a row amends the older text in the same pull request (task 6.3 checks that none is left), and the two changes can be archived in either order because the requirements of this change have names that no other change uses.

| Older text | What this change replaces it with, and when |
|---|---|
| `poker-design-v2` design K10 (deck chips, round chips, "typed list: only when Custom is chosen"), the phone start wireframe, D29 | The gallery and the builder (S6, S7), by groups 3 and 4; the rest of K10 (the headline, the lead, the Beta tag once, "Card colours", the privacy line, the fixed Create button, the name step) stays |
| `poker-design-v2` K4 "Back" and K11 first paragraph | Back and face as skins (S5), by task 1.3; "no theme file changes" stays |
| `poker-design-v2` K4 "A deck of up to 14 cards is a wrapping grid ... above 14 a sideways row" | The 14 counts the scale cards and special cards follow the scale (S2, the hand wireframe), by task 1.2 |
| `poker-design-v2` wireframes with `[cup]` | `[?]` and `[|/]` (S4), by task 1.2 |
| `poker-design-v2` requirement "The start page is one decision and one button", scenarios "A preset fills the chips" and "A custom deck"; task 5.1 (delivered and released) | The deck is chosen in the gallery and a custom deck is made in the builder, by groups 3 and 4 |
| `poker-design-v2` requirement "A deck wraps or scrolls", scenario "Thirteen cards" | Fibonacci with its special cards, by task 1.2 |
| `scrum-poker` proposal "Decks", task 5.1, requirement "Decks", design "Statistics" | Seven families, four special cards, the builder and team decks; the cup is gone, by groups 2 to 5 |

## Security and privacy note

A deck is content, so it is encrypted with the room like a note: the labels in `settings.update`, the look and the name in `deck.style`. The relay sees one envelope of five fields more per deck change and learns nothing about the deck. On the device a deck is part of the team workspace, sealed with the device key (the existing local vault), and travels with the encrypted vault; no deck leaves the browser in the clear, no deck is uploaded to a catalogue, and no remote image, font or icon is loaded (the pictures are generated paths). A pasted list is parsed in memory and dropped. A card label is shown as text (never as markup), clipped to 6 characters, so it cannot carry markup or a long run of text. Imported or typed labels are never used as instructions.

## Impact on the free plan

One small sealed event more, `deck.style`, at most one per round, plus the `settings.update` when the deck changes. A 20-voter hour of about 1,170 events grows by the number of deck changes, tens at most. The budget of ADR-0042 is not affected; task 2.3 asserts the count of relay frames for a deck switch.

## Risks and open points

- **The art is a proposal.** The seven families are drawn from rules; whether each reads at 30 to 46 px is decided at the screenshot review of task 1.2, and a family that does not is simplified at small sizes (the table says how) or, if it still does not, replaced by `plain` at those sizes without changing the rule. `concepts/` is there to judge the idea before the code exists.
- **A picture by rank can mislead.** A custom deck of `1, 2, 4, 5, 20` draws its cards evenly. The label is always there and the picture is described as "where the card sits", but if the owner finds it misleading, `spiral` and `doubles` already use the value when it fits and the other looks can too (one rule, `t` from the value instead of the rank); nothing else changes.
- **Rooms of other versions.** An older client shows `~split` as text on a plain card and ignores `deck.style`; a newer client opening an old room sees the cup drawn as "Break (retired)" and plain looks. Task 2.3 tests both.
- **Special cards change the numbers' denominators.** `pass` leaves `cast`; the other three stay in it. A round of 6 with two passes is 4 cast. This is the rule the spec states; if it surprises, the alternative is to keep every card in `cast` and show the pass line only, a one-line change in `roundStatistics`.
- **Decks in the team space sync by the team's stamp.** Two devices editing the same team's decks while apart lose one edit. It is the documented limit of the workspace, accepted for a list of at most 12 decks; per-deck stamps would need a format change of the vault and are not worth it for this.
- **Fan geometry and skins depend on CSS `rotate`, `clip-path` and `color-mix`**, all in the baseline of the browsers the product supports; the oval table already needs `cos()` and `sin()`. A browser without them shows a flat row of cards and a plain edge.
- **The "Plain cards" setting is outside `LocalSettings`** (entry budget). It is a small duplication that `poker-in-retroboard` removes.
- Not decided here, and left to later changes: choosing another card than the suggestion, a per-story deck, sound, emoji throws, user-made card art, sharing a deck by link or file, a public catalogue of decks.
