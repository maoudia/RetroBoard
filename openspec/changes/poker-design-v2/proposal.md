# Proposal

## Why

The owner opened the live Scrum Poker room on a phone and said its design is awful. The screenshot shows why: a long scrolling page that starts mid-sentence, three lines of text before anything visual, one small seat card pinned to the left of an empty area, a plain "Result" box with six text labels and a boxed cell for the suggested card, two buttons with a glowing one, and the hand of cards, the only thing a voter taps, at the very bottom of the page, below the results, off screen. Measured on release 1.64.0 (`before/`), the room is 1.04 to 1.54 screens long on a 390x844 phone (more on a real phone, which shows about 670 px of page), the hand is below the fold after the reveal, the cards are pale chips and not cards, the seats are a list, the results have no hierarchy and no picture of the votes, and on a TV or a laptop the room is the same 44 rem column with the hand out of view. `design.md` lists 33 defects, each with its evidence, why it hurts and the fix.

The reference the owner showed earlier (pokeragile.com on a phone) is clean: a headline, preset chips, one big Create button. RetroBoard's room works (sealed ballots, the real relay, the shared ledger) and its start page already has the good parts of that reference; what is missing is a design that makes the room calm, fits a phone, and looks like the rest of the product.

The mechanics of the room are done and tested; the presentation is the part that decides whether someone comes back, and poker is the acquisition surface of release 4. So the design is written first, as a change of its own, with wireframes per screen class and per state, a spec with scenarios that can be measured, and tasks ordered so that what the owner sees first (the phone voting screen and the hand of cards) comes first.

## What Changes

This change is the design and its spec. It ships no application code; the tasks in `tasks.md` are the implementation, in six groups of about two hours per task, each group one pull request.

- **One viewport on a phone.** The room is a bar, a middle region and a dock over the dynamic viewport; the page does not scroll for up to 8 voters at 390x664 and 360x640.
- **The thumb zone holds what you tap.** A dock at the bottom holds the hand while voting and the moderator's actions after the reveal; the hand never sits below the fold.
- **Real playing cards.** A card shape with a large centred value, small corner values, a back pattern drawn from the theme's tokens; a flip under 400 ms and none under reduced motion; the chosen card shown by shape (lifted, ringed, checked), not by colour alone.
- **A table.** A compact grid of seat cards on a phone, seats around an oval table from 600 px; each seat shows an avatar, a name, a voted or waiting state (never the value before the reveal), and the role as an icon with an accessible name; no duplicated numbers.
- **Results as a picture.** A distribution (a bar per card with its count), a consensus meter with words, average and median as two large numbers, outliers marked with an icon and words, and the suggested card as an action ("Use 5").
- **One primary action per state.** Reveal, then Vote again and Next round with one filled and one quiet; rare actions (language, light or dark, the way back) in an overflow menu.
- **The link out of sight.** The invite link and QR code live in a sheet behind one Invite button, so the room key is no longer printed on every shared or projected screen.
- **Short copy.** One status line, one muted hint at most, headings for assistive technology only.
- **Start page and name step** keep the parts of the reference worth keeping (one click to start, deck chips, a typed list shown as round chips, a collapsed colours section) with RetroBoard's look, and a Create button fixed at the foot of a phone.
- **Larger screens.** Tablet, laptop, wide and TV layouts; on a TV and in presentation the content scales with the type scale and the chrome does not.
- **Gates.** Contrast and axe over the nine themes in light and dark, overflow in fr, en and the pseudo-locale (which today does not reach the poker pages), a screenshot review against the wireframes, the bundle budget.

Two small additions outside the components, both needed by the design and both in the shape the epic already planned: the pure functions `consensusLevel` and `outliers` in `packages/application/src/estimation/`, and the domain command `estimate.decide` (and the optional `hue` of `settings.update`) in `packages/domain/src/estimation/`, with their wire bodies.

Out of scope: stories, the backlog and the round history strip (`scrum-poker` group 4), the short code and the join by code, the passcode and "everyone moderates" (2.1 and 2.2), the countdown and auto-reveal (3.3), the "please explain" timer, choosing another card than the suggestion, the export doors and library entries, the public `/poker` page (7.1), sound, emoji throws, a new theme field or any theme file change, a new dependency, any change of the transport, the envelope, the relay or the sealed ballots, accounts or paid tiers.

Bounded contexts: Presentation (the pages and components of `apps/web`) and, for the two small additions, Estimation (domain and application). Sharing and Room access are used as they are (the invite sheet shows the link the room already builds).

Relay traffic and the free-plan budget: two small events more, `estimate.decide` (at most one per round) and `settings.update { hue }` (at most one per room), sealed envelopes like the rest. A 20-voter hour of about 1,170 events grows by tens of events; the budget of ADR-0042 holds.

Relation to `scrum-poker`: that epic's tasks 3.1 (table, seats, hand, reveal) and 3.2 (results panel) describe what this change designs in detail. They are delivered through the groups here; what is not visual in 3.2 (the "please explain" timer) stays in `scrum-poker`. Its requirements are not rewritten: the delta of this change adds requirements that refine them (the layout and the look), so the two changes can be archived in either order.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `scrum-poker`: the room's layout, cards, seats, results, actions, invite sheet, start page, larger screens, accessibility, themes and language rules (delta in this change; it refines the requirements "Sealed cards revealed together", "Results for the discussion", "Decks" and "Accessible and themed table" of the `scrum-poker` change without rewriting them).

## Impact

- Changed: `apps/web/app/pages/poker/index.vue` and `room.vue`, `apps/web/app/components/poker/` (rewritten: card, seat, table, hand, dock, results, bar, invite sheet), `apps/web/app/poker/strings.ts` and `client.ts` (view model), `tests/e2e/poker.spec.ts` (the selectors that change; the testids of surviving elements stay).
- Added: `packages/application/src/estimation/` `consensusLevel` and `outliers`; `packages/domain/src/estimation/` `estimate.decide` and `hue`; their wire bodies in `packages/protocol/`.
- Docs: `docs/design-system.md` (a section for the poker table and cards), `docs/DEVELOPMENT.md` (the poker section), the user-guide chapter `poker` in fr and en and its manifest (`tests/docs/manifest.ts`), regenerated with `pnpm docs:tour && pnpm docs:guide`.
- Not changed: the relay, the protocol envelope, sealed ballots, the transport, the themes package, CSP (no inline script or style, no third-party origin), the bundle of the landing page and boards (the poker pages stay lazy; the budget check is part of every group).
