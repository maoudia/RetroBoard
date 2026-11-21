# Proposal

## Why

The owner reviewed the live Scrum Poker and gave two directions. The first is this change: "Card values typed as a comma-separated list is bad. I want a beautiful UX and UI design, not a copy of other tools' UI. And why coffee? I don't know, be creative for cards."

Both complaints are fair, and `before/` shows them on the pages of release 1.67:

- **The deck is a text field.** Choosing "Custom" on `/poker` opens a box with "Your cards, separated by commas". A mistake gives one red sentence under the box ("Two cards are the same.", "A card is 6 characters at most, with no control character."), which does not say which card is wrong, and the picture of the deck (the round chips) disappears exactly when the list is wrong. The same list is the only way to define a deck in the whole product.
- **The decks are names, not cards.** Five text pills ("Fibonacci", "Modified Fibonacci", "T-shirt", "Powers of 2", "Custom") and, under them, the deck as round chips that look like buttons. A person sees a card for the first time after creating a room. Nothing in a 13 or in an XL says that it is bigger than an 8 or an L; the card is a number in a box, the same for every scale.
- **The coffee card is an emoji.** It is the one card drawn by the operating system's colour font, it does not follow the theme, its corner marks are two smaller cups, and it means "I need a break", which is a decision of the facilitator and not a vote. The owner does not know why it is there, and the honest answer is that it is inherited from other tools.
- **Poker says "?" and nothing else.** The things people actually want to say in an estimation (I need more information; this is too big, split it; I have no stake in this one; we already know this one) have no card, so they are said out loud and the sealed ballot loses its point.

The mechanics are right and stay: sealed ballots, the hand as a radio group, the typed names of cards on a keyboard, the one-viewport phone room of `poker-design-v2`. What is wrong is the way a deck is shown, chosen and made.

## Sequence

Owner decision of 2026-11-21: the standalone poker is kept and finished first, and the integration with the board comes after. The order of the four poker changes is: (1) finish the actual poker, group 6 of `poker-design-v2` (in progress, another worker); (2) **`poker-deck-studio`, this change**, which stays inside the standalone poker and replaces its typed comma list and its coffee card; (3) `poker-in-retroboard`; (4) `board-estimation-phase`. This change starts when group 6 of `poker-design-v2` is merged and depends on nothing after it; the two that follow depend on it (the gallery, the cards and the skins are the surfaces they reuse).

## What Changes

This change is the design and its spec, written first. It ships no application code; `tasks.md` is the implementation, in six groups ordered so that what the owner sees first (the cards themselves) comes first.

- **Seven deck families where the card itself communicates the scale.** A card has two zones: a picture of where it sits on the scale and its label. Fibonacci draws the golden tiling growing with each term (Spiral); modified Fibonacci stacks stones into a heavier and heavier cairn (Cairn); powers of two fill a grid that doubles (Doubles); T-shirt sizes are one shirt that grows (Tee); complexity is a skyline of peaks (Peaks); time is an hourglass filling up (Hourglass); confidence is a target coming into focus (Focus). All are tokens and inline SVG generated from a few numbers, inside the bundle budget, and the label is always on the card, so a picture never carries information alone.
- **Special cards with a meaning replace the coffee card.** "Need more information" (the existing `?`), "Pass", "Split it" and "Already known", each with a written rationale, each counted in the results in its own way, and the coffee card is dropped with its reasons (the break belongs to the room's timer, `poker-in-retroboard`).
- **Each theme restyles the card face and the back.** A table of nine card skins (edge, corner, back pattern, tint) in the poker UI layer, a unit test that a theme without a skin cannot ship, and the contrast rules of `poker-design-v2` kept for every skin in light and dark.
- **A deck gallery, as a fan of real cards.** The start page shows the chosen deck as a large fan of five real cards, and every deck as a small fan to tap. Nothing to read before the first choice; Fibonacci is chosen, so one press still creates the room.
- **A visual deck builder instead of the typed list.** "Make your own" opens a builder: the deck as a strip of cards with a plus tile at the end (it suggests the next value), each card edited in place on a live preview, reordered by drag, by keys and by buttons, removed, with every problem said in words and pointed at on the card. A list can still be pasted, as an advanced import behind a menu.
- **Decks are saved to the local team space and travel with the room.** A team keeps its decks and a default one; the room carries the deck so everybody sees the same cards; a participant can save a room's deck to their own team. The moderator can switch the deck between rounds from the room, with the same gallery.
- **The comma-separated field is removed everywhere**, from the start page and from the e2e specs that type into it.
- **Built from the product's own parts.** The design language is RetroBoard's: the builder, the import and the deck sheet are `BaseDialog`s, the menus are `Dropdown`, the buttons are `.btn`, the choices are `.chip` and `.seg`, the on/off lines are `ToggleSwitch`, a deletion is a `ConfirmDialog`, the drag is `useTouchDrag`, the announcements go through `useLiveAnnouncer`. Only the cards and the deck tiles are new surfaces, and even they are made from the existing tokens, radii, spacing, motion and themes (`design.md`, "Components").

### What this replaces once it is implemented

`poker-design-v2` is implemented through group 5 and released, and its group 6 is being finished by another worker; its text says what shipped and stays as it is. This change is an additive follow-up: it does not rewrite or supersede that text now. When a task of this change is implemented, the pull request of that task replaces the following parts, in that pull request and not before (see `design.md`, "What this replaces once it is implemented"):

| Where | What it said | Replaced by |
|---|---|---|
| `poker-design-v2` K10, D29, requirement "The start page is one decision and one button", task 5.1 | Deck chips, the deck as round chips, a typed list for Custom | The deck gallery and the builder (groups 3 and 4 of this change) |
| `poker-design-v2` wireframes `[cup]`, K4 hand of "13 cards", scenario "Thirteen cards" with the coffee card | The coffee card in every Fibonacci hand | The special cards and the tray of the hand (this change, S4) |
| `poker-design-v2` K4 "Back" and K11 "no new theme field" | One lattice from `--accent` and `--surface` for the nine themes | Card skins by theme (S5); still no theme-package field, the skins live in the poker UI layer |
| `scrum-poker` proposal "Decks", task 5.1, requirement "Decks" | Presets with `?` and the coffee card, a custom deck typed as a comma-separated list | Seven families, the four special cards, the builder, team decks (this change) |
| `scrum-poker` design "Statistics" | "non-numeric cards (`?`, coffee, T-shirt sizes)" | The special cards and `signals` (S4, task 2.2) |

Out of scope: the start page's place in the product (the single creation flow of `poker-in-retroboard` moves the same gallery there), themes of the room itself and their imposition (`poker-in-retroboard`), stories, the backlog and estimates per story (`scrum-poker` group 4), importing a deck from a Jira field (`jira-estimation-import` task 2.2 will call the builder's deck proposal), the "please explain" timer, sound, emoji throws, user-uploaded card art or images (nothing user-made is drawn: a card is a label plus one of the closed family pictures), a new theme field, any change of the transport, the envelope, the relay or the sealed ballots, a new dependency.

Bounded contexts: Presentation (the poker pages and components), Estimation (deck definitions, validation, statistics of the special cards in `packages/application`; one new command in `packages/domain`), Team space (decks per team). Sharing and Room access are used as they are.

Relay traffic and the free-plan budget: one small sealed event more, `deck.style`, at most one per round (written by the moderator when the deck or its look changes), and the deck itself still travels in the existing `settings.update`. A 20-voter hour of about 1,170 events grows by tens at most; the budget of ADR-0042 holds (task 2.3 verifies it).

Bundle budget: the poker pages are lazy. The new code (glyphs, skins, gallery, builder, strings) is lazy too and is budgeted at 24 kB gzip in all, counted in the total (419.8 kB of 500 kB measured on 2026-11-21); the entry chunk, already at its 56.5 kB limit, must not grow (task 6.3 measures both).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `scrum-poker`: the picture of a card, the deck families, the special cards, the card skins, the gallery, the builder, team decks and the in-room deck switch (delta in this change, in the same form as the delta of `poker-design-v2`: the capability is still being built, so the requirements are added).
- `team-space`: a team keeps decks and a default deck (delta in this change).

## Impact

- Changed: `apps/web/app/pages/poker/index.vue` (the start page), `apps/web/app/components/poker/PokerCard.vue`, `PokerHand.vue`, `PokerResults.vue`, `apps/web/app/poker/strings.ts`, `card.ts`, `client.ts`, `tests/e2e/poker.spec.ts` (the selectors of the typed list and of the chips go; the testids of surviving elements stay).
- Added: `apps/web/app/poker/glyphs.ts`, `skins.ts`, `components/poker/PokerGlyph.vue`, `DeckFan.vue`, `DeckTile.vue`, `DeckGallery.vue`, `DeckBuilder.vue`, `DeckImport.vue`, `DeckSheet.vue`; in `packages/application/src/estimation/`: deck definitions with looks and special cards, `validateDeck`, `suggestNext`, `parseCardList`, signals in the statistics; in `packages/domain/src/estimation/`: the command `deck.style`; its wire body in `packages/protocol/`; `decks` and `pokerDeck` in the team workspace (`packages/application/src/team/workspace.ts`, `storage/workspace-merge.ts`).
- Docs: `docs/design-system.md` (the card, the skins, the gallery and the builder), `docs/DEVELOPMENT.md` (the poker section), the user-guide chapter `poker` in fr and en and its manifest (`tests/docs/manifest.ts`), regenerated with `pnpm docs:tour && pnpm docs:guide`. An ADR is not needed: no decision of ADR-0042 or ADR-0044 changes (the new command is one more body of the same kind-aware ledger).
- Not changed: the relay, the envelope, sealed ballots, the transport, the themes package, CSP (no inline script or style, no third-party origin), the landing page and board bundles.
