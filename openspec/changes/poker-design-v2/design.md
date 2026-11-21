# Design

Design first: this change writes the look and the layout of the Scrum Poker room down, with the evidence for it, before anyone changes a component. The code of the room already works (sealed ballots, the real relay, the shared ledger); what is wrong is what the person sees and touches. Everything below is checked against `docs/design-system.md` and the screens that already exist (landing, creation, board, presenter, composer, share and sync sheets), so the room looks like the same product.

Evidence: `before/` holds 86 screenshots of release 1.64.0 (phone 390x844, tablet 768, desktop 1280, TV 2560x1440; light and dark; one voter and six; start page, name step, before voting, after voting, after the reveal; French; the pseudo-locale), the owner's own screenshot, and `before/README.md` with the measurements. Reference outside the product: pokeragile.com on a phone, which the owner finds clean: a headline, preset chips, one big Create button.

## What the owner sees today

The owner's screenshot (`before/owner-live-phone-revealed.webp`) is a revealed round, alone, on a 390 px phone: a long page that starts mid-sentence, a heading "The table", a status line and a hint before anything visual, one small seat card pinned to the left of an empty area (the card 8, the name, a cramped "Moderator" pill and the number 8 again), a "Result" box with six text labels in a grid and a boxed cell for the suggested card, two buttons side by side with a glowing one, and, below all of it, the hand: pale chips on two rows with the chosen one filled blue. The thumb zone shows results while the thing to tap is off screen.

## Defects

Measured on the generated site of release 1.64.0 (`before/README.md`). "Fix" names the decision (K) of this design that removes it.

| # | What (evidence) | Why it hurts | Fix |
|---|---|---|---|
| D1 | The page scrolls on a phone: 877 px (1.04 screens) alone before voting, 968 px with six voters, 1,119 px revealed with six, 1,303 px with eight at 390x844. A phone browser shows about 670 px of page (the owner's screenshot), so it is 1.3 to 1.9 screens in practice (`phone-*-full`) | The state of the room (who voted, the result) is never seen in one look | K1: bar, seats and dock in one viewport; only the seat region scrolls, and only above 8 voters |
| D2 | The hand is below the fold after the reveal (its top is at 885 to 1,160 px of 844) and changes place with the state: sticky while voting, in the page flow once locked (`phone-1-revealed-light`) | The thing you tap is off screen, and what is tappable moves under the thumb | K2: one dock at the bottom that holds what can be tapped |
| D3 | While voting, the sticky hand lies on top of the second row of seats (`phone-6-voted-light`) | Half a row of seats and their states are hidden at first sight | K1: the seat region and the dock are separate rows; nothing overlaps |
| D4 | The moderator's buttons sit in the middle of the page between the results and the hand; a voter gets a sentence where a control would be | Actions are out of the thumb zone; the zone that matters carries prose | K2: the dock holds exactly what this person can tap, or one hint line |
| D5 | The share block (label, link field, copy button, QR toggle, privacy sentence) is the first thing on every room page, about 280 px high; the link is cut in the middle of the address | It pushes the table down, a cut address cannot be read or checked, and a once-per-session action is shown all the time | K5: an Invite sheet behind one button |
| D6 | Three lines of text come before anything visual: the heading "The table", the status ("Cards revealed", "4 of 6 have voted") and, when alone, "You are alone for now: share the link to invite your team" | One fact is said as a heading, as a status and as a hint; it reads like a form, not a table | K6: one status line in the bar and one muted hint at most |
| D7 | "Connected" is printed on every room page next to an h1 "Round 1" | The normal state needs no words (design system: say a fact once, show the exception) | K6: the status line shows only what is not normal ("Reconnecting...") |
| D8 | The table is a wrapping list of identical 114x156 px seat cards pinned to the left: one voter gives one card and a large empty area; on the TV it is the same list in a 704 px column | No sense of a table or of the others being there; empty space looks broken | K3: a compact grid on a phone, an oval table from 600 px, a ghost "Invite" seat when alone |
| D9 | After the reveal a seat says its value twice: on the card and again as a caption under the name (8 and 8) | Duplicated numbers read as two facts | K3: the value is on the card only |
| D10 | The role is a text pill "Moderator" squeezed into the 114 px seat; "(you)" wraps the name onto a second line ("(vous)" in French) | Cramped, and seat heights differ | K3: the role is an icon with an accessible name; "you" is a ring on the avatar and a hidden word |
| D11 | A long name wraps anywhere: a 22-character name breaks at its hyphen and takes three lines (`probe8-8-revealed-light`) | Seat heights jump and the grid looks broken | K3: one line with an ellipsis; the full name is the accessible name and the tooltip |
| D12 | A voted seat is told three ways (a solid accent block, the caption "Has voted", the count above); a waiting seat is a dashed outline with a contrast of 1.41:1 against its surface in light and 1.51:1 in dark | State by fill colour and by a line under the 3:1 of WCAG 1.4.11, and said again and again | K3: state is a shape (card back or empty slot) plus an icon (check or clock) with a hidden word; the count is said once, in the bar |
| D13 | The cards are not cards: the back is a flat block of accent, the face a number in a rounded rectangle, the hand pale chips with the shape of buttons (`phone-6-voted-light`, the owner's screenshot) | It does not read as poker; no corner values; chips look disabled and compete with the pill buttons | K4: a playing card component |
| D14 | The chosen card is shown by fill colour only; once locked, the whole hand fades with `opacity: .6`, so the chosen chip's label falls to 2.70:1 in light and 3.33:1 in dark, and the others sit at 4.58:1, one step from the limit | State by colour alone (WCAG 1.4.1) and text under 4.5:1 (1.4.3) just when people look at their own card | K4: chosen = lifted, ringed and checked; K2: the hand leaves at the reveal instead of fading |
| D15 | A heading "The cards are revealed" sits above a locked hand and a visible legend "Pick a card" above an open one; a two-line keyboard hint ("From the keyboard: type the name of a card...") sits in the thumb zone of a touch phone | The heading reads like a result; the hint is for keyboards and costs 40 px of the zone that matters | K6: the legend is for assistive technology; the keyboard hint shows only on a device with a fine pointer |
| D16 | Results: six facts (Average, Median, Most chosen, Spread, Agreement, Suggested card) at one weight in a wrapping grid that reflows by width and language (4+2 in English, 3+3 in French, `phone-fr-6-revealed-light`) | No hierarchy: nothing says what to read first; the grid jumps | K7: two large numbers, then a meter and a distribution |
| D17 | The suggested card is a boxed cell with an accent outline that looks like an input and does nothing | The one value a moderator acts on is not an action, and it looks editable | K7: a pill button "Use 5" |
| D18 | One fact repeated: with one voter Average, Median, Most chosen, Spread ("8 to 8") and Breakdown ("8 x 1") all say 8; "Breakdown" is a line of text | Six statements of one fact, and the distribution of the votes, the point of the discussion, has no picture | K7: a distribution (a bar per card with its count); "most chosen" and "spread" are no longer separate facts |
| D19 | Agreement is a bare percentage ("50%", "100% (unanimous)"): no meter, no verdict in words; the lowest and highest cards, required by the spec of `scrum-poker`, are shown nowhere | "50%" cannot be read as good or bad; the cards to discuss are not pointed at | K7: a consensus meter with words; outliers marked with an icon and text |
| D20 | "Vote again" is filled blue with a glow and "Next round" is an outline, equal width, side by side, both 48 px (`phone-1-revealed-light`) | The emphasis does not follow the likely next step, the glow breaks the calm rule, and the two look like peers | K9: one filled, one quiet; the emphasis follows the agreement |
| D21 | Reveal is a disabled filled button with two possible hints ("You can reveal after the first vote", "Only the device that opened the round can reveal it") | A disabled primary plus a sentence is noise; the second hint is a system detail | K9: Reveal appears when a vote exists; the rare "another device holds the round" case is one line in the status |
| D22 | Targets under 44 px: the back button is 29 px high, "Join the room" 37 px, Reveal, Vote again and Next round 37 px from 481 px up | Under the design system's 44 px and hard to hit with a thumb (WCAG 2.5.8 asks 24 px, the product asks 44) | 44 px everywhere, 48 px for the primary on a phone |
| D23 | No light/dark control exists on the poker pages (a board has it, and only the variant is personal); the language pair EN FR, two 44 px squares, takes the top right corner of every room page | A participant cannot pick dark in a dark room, and the rarest control has the best place | K6: both go to the overflow menu; on the start page the language is the pill of the landing page |
| D24 | Tablet and desktop use the same single 44 rem column; at 1280x800 with six voters the hand starts at y=764 and its buttons at y=924 of 800 (`desktop-6-before-light`); on the 2560 px TV the column is 704 px wide and the rest is empty | No table, wasted screen, and scrolling on a laptop to reach the hand | K3 and K8: layouts by screen class |
| D25 | Nothing scales on the TV: text and cards keep their phone sizes (`--type-scale` 1.5 is unused) although the room is read from the other side of a table | Unreadable at distance; breaks "TV scales the content, not the chrome" | K8: content sizes come from the type scale, the chrome stays |
| D26 | The flip lasts the whole `--dur-slow` (400 ms) where the rule is under 400 ms; the face holds only the value, no corner values | At the limit, and flat | K4: 280 ms with a total stagger of at most 60 ms |
| D27 | Start page: "Team colours" opens a sentence saying the feature will come later | A promise is not a feature and it costs a tap | K10: nothing (amended: no colour picker; the theme gives the colours) |
| D28 | Start page: two long muted paragraphs under the button (privacy in three lines, beta in two) although the BETA tag says it; the button is not fixed at the foot of a short screen | More text than the choice above it | K10: one muted line, Beta said once, the button fixed at the bottom of a phone |
| D29 | Start page: the typed list shows the whole deck in a long field (cut at the coffee card), then the same deck again as round chips; a lead, a legend and a label stack above the chips | The deck is said twice, and four text levels come before the first choice | K10: the round chips are the deck; the field shows only for Custom |
| D30 | The pseudo-locale check passes without testing the poker pages: `pt()` ignores `?lang=pseudo` (`phone-pseudo-start-light`: the button still says "Create the room", only the shared BETA tag is lengthened) | The overflow guard of the product does not reach this page | K12: `pt()` goes through `pseudolocalize`; the overflow spec covers the poker routes |
| D31 | French is longer ("Carte suggeree", "Copier le lien", "(vous)"): the room grows by about 20 px (988 px against 968, 1,139 against 1,119 when revealed) and the results grid goes from 4+2 to 3+3 | The layout is tuned in English only | K12: regions that wrap or ellipsize, checked in fr, en and pseudo |
| D32 | Dark: a voted seat is a large flat block of `--accent` (#4da3ff) | Large bright areas glare in a dark room, and the same colour already means "chosen" in the hand | K4: a patterned back in a muted mix of the accent and the surface |
| D33 | The invite link, with the room key in its fragment, is printed in a field on every room page, so on every projected or shared screen | A screen share or a photo of the TV hands the key to whoever sees it | K5: the link exists only in the Invite sheet, hidden until asked; Copy works without showing it |

What is right and stays: the real protocol and sealed ballots, the typed names of cards on a keyboard (`5`, `1` then `3`, `?`), the hand as a radio group, the start page's deck chips with a typed list shown as round chips and a collapsed colours section (the parts of the reference worth taking), the "Beta" mark, the bad-link and board-link notices.

## Principles and the rules they become

| Principle | Rule (K = decision below) |
|---|---|
| KISS, calm, modern 2026 | Nothing on screen that is not needed for the state; flat surfaces, one accent, no glow, no texture; state by shape and word before colour (K6) |
| One primary action per state | One filled button per view and role (K9) |
| The thumb zone holds what you tap | A dock at the bottom of a phone holds the hand while voting and the moderator's actions after the reveal; never below the fold (K2) |
| The room fits one phone viewport | 390x664 and 360x640, up to 8 voters, no scrolling (K1) |
| Real cards | A card shape with a large centred value, small corner values, a patterned back from the theme (K4) |
| A table, not a list | Compact seat grid on a phone, seats around an oval table from 600 px (K3) |
| Results that help the talk | Distribution, consensus meter with words, two large numbers, outliers with icon and text, the suggestion as an action (K7) |
| Calm motion | Flip under 400 ms, none under reduced motion (K4) |
| Same product | Pill buttons, `--fs-*` `--r-*` `--sp-*` tokens, Lucide icons at the left of labelled buttons, `BaseDialog` for the sheet (K5, K11) |
| Everyone can use it | WCAG 2.2 AA in nine themes and both variants, 44 px targets, keyboard, fr and en, overflow-safe (K11, K12) |
| TV and presenter scale the content | Sizes of cards, seats and numbers come from the type scale; the bar and menus do not (K8) |

## Decisions

### K1. One viewport on a phone

On a phone (`data-screen="phone"`, under 600 px) the room is a grid of three rows over `100dvh`: the bar, the middle region (seats, then results after the reveal) and the dock. The page itself never scrolls; the middle region is the only thing that may, and only when it does not fit.

The reference viewport is 390x664, not 390x844: a phone browser shows about 670 px of page between its bars (the owner's screenshot). The floor is 360x640. Up to 8 voters the middle region does not scroll in any state; at 9 to 20 voters it scrolls on its own while the bar and the dock stay where they are.

Budget at 390x664, 13-card deck, 8 voters (px):

| Region | Lobby or voting | Revealed |
|---|---|---|
| Bar (`--toolbar-h`) | 56 | 56 |
| Seats, 4 columns by 2 rows (a seat: avatar 20 + card 50 + name 16 + gaps and padding = 96) | 2 x 96 + 8 = 200 | 200 (the face-up card replaces the back) |
| Results card (padding 24, numbers 48, meter 28, distribution 76, one outlier line 22, Use button 44, gaps 32) | none | 274 (296 with two outlier lines) |
| One hint line | 24 | none |
| Dock | hand 2 rows (7 + 6 cards of 46x64 + gap 6) 134 + padding 24 = 158, plus Reveal 48 + 8 for the moderator = 214 | one row of buttons 48 + padding 24 = 72 (a voter: one hint line, 56) |
| Total | 494 | 602 (624) |
| Slack | 170 | 62 (40) |

The slack is deliberate: French is longer (D31) and a safe-area inset takes a few px. The check measures it (tasks 2.3 and 3.2); a state that does not fit is a failure, not a reason to let the page scroll.

### K2. The dock, the thumb zone

The dock is the bottom row of the room on every screen class; on a phone it sits on the safe-area inset and is the only fixed thing next to the bar. It holds, and only holds, what this person can tap in this state:

| State | Voter | Moderator |
|---|---|---|
| Lobby, alone | hand (the filled button is Invite) | filled Invite, then the hand |
| Voting, not voted | hand | hand; filled Reveal above it once a vote exists |
| Voting, voted | hand with the chosen card lifted; one hint line | the same, with filled Reveal |
| Revealed | one hint line ("Malaka starts the next round.") | Vote again and Next round; one filled, one quiet (K9) |
| Between rounds | the hand again, nothing chosen | the hand again |
| Watching (observer or a full room) | nothing; the bar says "Watching" | not applicable |

The hand does not fade after the reveal (D14); it leaves, and the dock shows what comes next. The previous round's own card is on the seat. The hand and the buttons are never both in the dock after the reveal, so the thumb never has two jobs.

### K3. Seats and the table

A seat is: the card slot (a card back when the person voted, an empty slot when not, the face after the reveal), the avatar (the initial on the person's hue, the same hue rule as the board's participants), the name on one line, and two small marks: the role (an icon) and the state (an icon). Nothing else.

| Seat part | Rule |
|---|---|
| Avatar | Initial on the hue of the person (`nameHue` until a profile hue is known), 20 px on a phone and 24 px from the tablet; a 2 px ring in `--accent` marks "you", plus a hidden word "you" |
| Name | One line, ellipsis; the full name is the accessible name and the tooltip; `--fs-sm`, `--fs-xs` from 9 voters |
| State | A card back with a check icon (voted); an empty slot with a clock icon (waiting); an eye icon in place of the slot (watching). Each has a hidden word, so a screen reader hears "Ann, voted". The value is never in the DOM before the reveal |
| Role | `lucide:crown` for the moderator, with the accessible name "Moderator"; observers get `lucide:eye` as their state, named "Watching" |
| After the reveal | The face-up card shows the value once. No caption repeats it |
| Outlier | An icon on the seat (`lucide:arrow-up-to-line` highest, `lucide:arrow-down-to-line` lowest) with a hidden word, and the same words in the results (K7) |

Layouts by screen class (`packages/themes/src/screens.ts`):

| Class | Seats |
|---|---|
| phone (under 600) | Compact grid of `repeat(auto-fit, minmax(76px, 1fr))`, which is 4 columns at 390 and at 360 px, each seat about 83x96 px |
| tablet (600 to 1023) | Oval table: seats on an ellipse around the table; the person is at the bottom centre, the others follow clockwise in join order. Seat size 96 px up to 8, 80 px at 9 to 14, 64 px at 15 to 20 (avatar, card and a one-line name) |
| laptop (1024 to 1599), wide (1600 to 2399) | The same oval, larger, with the results panel at its side (K7) |
| tv (2400 and more) | The same as wide, with the content sizes multiplied by the type scale (K8) |

The oval is CSS, with no script: `--n` seats, `--i` the index, the position `translate(calc(cos(var(--a)) * var(--rx)), calc(sin(var(--a)) * var(--ry)))` with `--a: calc(90deg + 360deg * var(--i) / var(--n))`. The DOM stays a list in join order, so reading order and tab order do not depend on the picture. Where trigonometric functions are not supported the table falls back to the phone grid. Alone, the person sits at the bottom of the oval and a ghost seat (dashed, a plus icon, the accessible name "Invite") opens the Invite sheet.

### K4. Playing cards

One `PokerCard` component draws every card of the room (the hand, the seats, the distribution's labels): the same shape and the same tokens everywhere.

| Part | Rule |
|---|---|
| Shape | Ratio 5:7. Phone 46x64 px in a hand, 36x50 on a seat; tablet 60x84; laptop 72x100; wide 80x112; TV the wide sizes times the type scale. Radius `var(--r-card)` scaled with the card, never a pill (buttons are pills; cards are not buttons) |
| Face | `--surface`, 2 px edge in `--muted` (3:1 against the page background by the contrast of `--muted`), the value centred in `--f-display`, weight 700, tabular digits, and small corner values (top left, and bottom right turned 180 degrees) in `--fs-xs` `--text`. The value is `--fluid-2xl` for one or two characters, `--fluid-xl` for three, `--fluid-lg` beyond (cards hold at most 6 characters) |
| Back | A diamond lattice made of `repeating-linear-gradient` in `--accent` and a mix of `--accent` and `--surface`, framed by a 3 px inner border in `--surface`. It uses only tokens, so each of the nine themes has its own back. No text, no image, decorative (`aria-hidden`) |
| Empty slot | A dashed 2 px edge in `--muted`, transparent, a clock icon in `--muted` |
| Chosen (hand) | Lifted 10 px, a 3 px ring in `--accent` with a 2 px offset, a check badge in the top corner (`--accent` with `--accent-ink`): three cues, two of them shapes. The card is not filled with the accent, so the value keeps the contrast of `--text` on `--surface` |
| Locked | Not used: the hand leaves instead (K2) |
| Focus | The usual `:focus-visible` ring (2 px `--accent`, 2 px offset), never removed |
| Hover | A 2 px lift on devices with hover; none on touch |
| Forced colours | Edges in `CanvasText`, the chosen card in `Highlight`, as the toggle buttons of the board do |

A deck of up to 14 cards is a wrapping grid, centred, rows as needed (7 + 6 on a 390 px phone), every card at least 44x44. A custom deck above 14 cards (up to 24) is one row that scrolls sideways with `scroll-snap-type: x proximity`, a fade at both edges and the chosen card scrolled to the centre. Cards never overflow the page sideways.

Flip. On the reveal every seat's card turns from back to face with `rotateY` over 280 ms (`--dur-base` is 250 ms, `--dur-slow` 400 ms; this one is its own constant), eased out, the whole table starting within 60 ms (a stagger of 10 ms per seat, capped at 60 ms), so the last card lands before 400 ms. Under `prefers-reduced-motion: reduce` and under the setting `data-motion="reduced"` there is no animation at all: the face is simply there. The value is not rendered into the seat before the reveal, so even a stuck animation reveals nothing early.

Choosing a card: the lift is a 150 ms transition (`--dur-fast`), none under reduced motion.

### K5. Invite in a sheet

The room never prints its link. The bar has an Invite button (`lucide:user-plus`, icon only on a phone with the accessible name "Invite", icon and label from the tablet up); the ghost seat and the lobby's filled button open the same sheet.

The sheet is a `BaseDialog` like the board's share dialog: the title "Invite", a QR code of the participant link (200 px, the same `QrCode` component), one filled button "Copy link" (it copies without displaying the address), "Share" when the browser has a native share sheet, and one muted line ("Anyone with this link can join. It never goes to the server."). Closing returns the focus to the button that opened it. The link is the participant link (it never carries the moderator secret), as today. A later group adds the short code (task 2.1 of `scrum-poker`) in the same sheet.

### K6. Short copy, one status line, the overflow menu

- The bar: back (`lucide:arrow-left`, 44 px), the round and one status line under it, Invite, and the overflow button.
- The status line says one thing: "2 of 6 voted" while voting, "Revealed" after, "Watching" for an observer, "Reconnecting..." or "The room is full" when not live. "Connected" is not said.
- At most one muted hint line per screen, in the dock or under the seats, from this table (en text; fr is written with it):

| State and role | Hint |
|---|---|
| Lobby, alone | "Share the link, then pick a card." |
| Voting, not voted | none; the hand is the hint |
| Voted, others missing | "Waiting for Dee and Eli." (two names, then "and 3 others") |
| Everyone voted, a voter | "Everyone has voted. Waiting for Malaka." |
| Everyone voted, the moderator | none; Reveal is the filled button |
| Revealed, a voter | "Malaka starts the next round." |
| Another device holds the round | "Only the device that opened the round can reveal it." |

- Headings are for assistive technology: the room is a `main` with the regions "Table", "Results" and "Your hand" (`aria-label`s), the visible h1 is the round.
- The bar is the bar of the application (amended after group 5, on the owner's request that every page of the product have the same shell): `AppBar`, the header of a board's toolbar (the mark that leads home, the tools at the right, light or dark and the avatar last). A room adds Invite as its first tool, where a board has Share. Language, theme, settings, the guide of the page and the ways to give feedback are in the profile dialog behind the avatar, as on every page, so the poker pages have no menu of their own and no language pill; nothing new is stored. The bar is the height of the toolbar (`--toolbar-h`, 56 px on a phone) and keeps its sizes on a TV.
- No exclamation marks, no sentence that explains the interface.

### K7. Results

After the reveal the results card sits under the seats (phone and tablet portrait) or beside the table (laptop and wide). It has five parts, in this order:

1. Two large numbers, Average and Median (`--fluid-3xl`, tabular digits, one decimal at most), each with a small label. An ordinal deck (T-shirt) has no average: the median is one large word and the card says so. A round with no numeric card says "No numbered card in this round" and keeps the rest.
2. A consensus meter with words. A bar filled to the share of the votes on the most chosen card, with the verdict in words at its left and the share at its right ("Some agreement  60%"), as `role="meter"` with `aria-valuetext` carrying the words. The verdict is a pure function of the share of the cards cast on the most chosen card:

| Share on the most chosen card | Words (en) |
|---|---|
| 100% | Everyone agrees |
| 75% and above | Strong agreement |
| 50% and above | Some agreement |
| under 50% | No agreement yet |

3. The distribution: one column per card that was chosen, in deck order, its count above and the card value below (the value as a small card face), the height proportional to the count (at most 24 px on a phone under 760 px high, 40 px on a taller phone and 56 px elsewhere, at least 4 px for one vote; the 24 px keep the revealed room of eight voters with both outlier lines inside 360x640), columns at least 24 px wide and 4 px apart, wrapping to a second row rather than overflowing when more than about 12 different cards are played. It is a list (`ul`, one `li` per card, "5: 3 votes" for assistive technology); the count is in the picture, so colour is never the only carrier. `?` and the coffee card are counted and drawn, and kept out of the average and the median (statistics unchanged).
4. Outliers. The lowest and the highest card that are not the most chosen card, when the spread is more than one step of the deck. Each is one line with an icon and words: "Highest: 13 (Cy)", "Lowest: 3 (Bob, Dee)". The same icon is on the seats (K3). With one voter, or when everybody agrees, there is no outlier line. (The "please explain" timer of `scrum-poker` task 3.2 hangs from these marks and is not part of this change.)
5. The suggested card as an action: a quiet pill button "Use 5" (`lucide:check`) for the moderator. It records the suggestion as the estimate of the round (`estimate.decide`, below); everybody then sees "Estimate 5" with a check icon in its place. A voter sees the suggestion as text ("Suggested: 5"). The suggestion is the card nearest to the median and is never applied by itself.

"Most chosen" and "Spread" are no longer separate facts: the distribution shows them. Nothing in the card is a number that appears twice.

### K8. Larger screens, the TV and the presenter

| Class | Layout |
|---|---|
| tablet portrait (768x1024) | Bar; the oval table on top, taking the height the results and the dock leave (about 690 px for up to 8 seats, and the same after the reveal, when the results card sits under it in two columns (numbers, meter and outliers at the left, distribution at the right)); a table never gets shorter than its seat count needs (480 px up to 8 seats, 660 up to 14, 800 up to 20, times the type scale), so 9 to 20 voters can make the middle region scroll on a tablet and a laptop, never overlap seats; the dock |
| laptop (1280x800) | Bar; the oval table at the left, about 60% of the width; the results panel at the right (about 360 px) after the reveal, before it a quiet panel with the round and the count; the dock under both, centred |
| wide and TV | The same layout; card, seat, avatar, number and text sizes are multiplied by `--type-scale` (1.125 wide, 1.5 TV) |

The content scales, the chrome does not: the sizes of the seats, cards, numbers and the results text come from `--fluid-*` and `calc(<rem> * var(--type-scale))`; the bar, the menus and the sheets keep their `--fs-*` sizes and 44 px targets (the same rule as the presenter bar and `dialog.dlg`). On a TV the dock is shown only to a person who votes; a person who only watches has a larger table and no dock.

### K9. One primary action per state

| State | Voter | Moderator |
|---|---|---|
| Lobby, alone | pick a card | Invite (filled) |
| Voting | pick a card | pick a card; Reveal (filled) as soon as at least one card is in |
| Everyone voted | wait (hint) | Reveal (filled) |
| Revealed, agreement strong or full | nothing to tap | Next round filled, Vote again quiet, "Use 5" quiet in the results |
| Revealed, agreement some or none | nothing to tap | Vote again filled, Next round quiet, "Use 5" quiet |
| Between rounds | pick a card | pick a card; the filled Reveal returns with the first card |

Vote again keeps the left place and Next round the right, whichever is filled; only the emphasis moves, because the likely next step is a re-vote when the room disagrees and the next item when it agrees. This is the one adaptive rule of the design; if the owner prefers a fixed hierarchy, the fixed filled button is Next round (the common end of a round) and nothing else changes. No glow: the primary of the dock is a filled pill with the quiet `--shadow-1` of a card, not the glow of `.btn-primary` (the rule is local to the room; the shared button is unchanged).

Rare and destructive actions are out of the way: language, theme and the way back are in the bar of the application (the profile dialog and the mark); leaving the room, changing the moderator and the deck belong to the later tasks of `scrum-poker` (2.2, 5.1) and will be menu items, never buttons in the dock.

The new domain command `estimate.decide { round, card }` (the moderator only, a revealed round, a card of the deck, once per round and replaced by the next round) is added by task 3.3 for the "Use 5" action: a button without an effect is not shippable, and the command is the one the design of `scrum-poker` already lists. When stories arrive (task 4.1 of `scrum-poker`) the decided card becomes the story's estimate; this change does not add stories.

### K10. Start page and the name step

The start page keeps what the reference does well (one click to start, preset chips, one big Create button) and what the room already has (the typed list shown as round chips, the collapsed colours section) with the look of RetroBoard.

```
Phone, 390 px
+--------------------------------------+
| (<) RetroBoard                 (EN|FR)|   bar: the landing page's pill for the language
|                                      |
|  Scrum Poker  [BETA]                 |   h1 (--fs-3xl) and the one Beta tag
|  Estimate together. Nobody sees a    |   one lead line (--fs-lg)
|  card until the reveal.              |
|                                      |
|  (Fibonacci) (Modified) (T-shirt)    |   deck chips, a radio group, 44 px, wrap
|  (Powers of 2) (Custom)              |
|                                      |
|  (0)(1)(2)(3)(5)(8)(13)(21)(34)(55)  |   the deck as round chips: this is the deck
|  (89)(?)(cup)                        |
|                                      |
|  [ 1, 2, 4, 8, ?              ]      |   typed list: only when Custom is chosen
|                                      |
|                                      |
|  Encrypted in your browser. No       |   one muted line
|  account.                            |
+--------------------------------------+
|  [ (play) Create the room ]          |   filled, 48 px, fixed at the bottom
+--------------------------------------+
```

- Laptop and up: the same content in a 36 rem column, centred; Create is in the flow, under the deck, 56 px.
- Choosing a chip fills the round chips; choosing Custom shows the field with the current deck as its start; a typed list is checked as today (2 to 24 cards of at most 6 characters, no duplicate) and a problem is said under the field with `role="alert"`. The long field of D29 no longer exists for a preset.
- There is no colour picker in poker (amended after group 5, on the owner's direction): the cards, the seats, the table and the results take their colours from the active theme like a board. A team colour, if it is wanted later, comes from the theme system, not from a picker. `settings.update` keeps an optional `hue` in its wire body only so that an event of the first version still folds; it is ignored.
- The lead line replaces the lead, the legend and the label; the privacy line replaces both paragraphs. Beta is the tag only; the "Suggest an idea" link is with the feedback links of the profile dialog (amended: the bar of the application replaces the overflow menu).
- Name step (room link opened, no name yet). Same look as the start page, the table not drawn behind it:

```
+--------------------------------------+
| (<) Scrum Poker                (...) |
|                                      |
|  What should we call you?            |   h1
|  [ Malaka______________________ ]    |   prefilled with the name this browser uses
|  Only a name. No account.            |   one muted line
|                                      |
+--------------------------------------+
|  [ (users) Join the room ]           |   filled, 48 px, fixed at the bottom
+--------------------------------------+
```

### K11. Themes, tokens and accessibility

All of it is component CSS on tokens; no theme file changes and no new theme field (a themed card back would need one; the lattice from `--accent` and `--surface` is enough for nine themes and is revisited only if two themes' backs look alike in review).

| Need | Token |
|---|---|
| Page, surfaces | `--bg`, `--surface`, `--surface2` |
| Text, corner values, names | `--text`; hints `--muted` |
| Card edge and empty slot | `--muted` (3:1 or better on the page and the surface in the nine themes) |
| Chosen ring, back lattice, check badge, meter fill | `--accent` with `--accent-ink` on it; the lattice second tone `color-mix(in oklab, var(--accent) 60%, var(--surface))` |
| Oval table fill and edge | `--surface2`, `--border` (decorative) |
| Sizes of text | `--fs-*`, `--fluid-*`; never a literal size (`design-tokens.test.ts`) |
| Radii | `--r-card` for cards and panels, `999px` for buttons and chips, `50%` for avatars |
| Space | `--sp-*` |
| Motion | `--dur-fast`, the 280 ms flip constant, none under reduced motion |
| Elevation | `--shadow-1` for the results card and the lifted card; `--shadow-2` for the sheet |

Accessibility: every value, count and verdict is text; a card state is a shape and an icon; the meter and the distribution have text equivalents; targets are 44 px (48 for the primary on a phone) and 8 px apart; the hand is a radio group with arrow keys (they move and choose) and the typed names of cards keep working; focus order is bar, seats, results, dock; `role="status"` announces "2 of 6 voted", "Cards revealed. Average 7.2, median 5. Some agreement." and "Round 3. Pick a card." politely and once; the oval's visual order never changes the reading order; WCAG 2.2 AA is checked by axe in light and dark and by the contrast spec over the nine themes in both variants, on the start page, the name step and the room in each state.

### K12. Language and overflow

Every string has an `fr` and an `en` key (`apps/web/app/poker/strings.ts`, French the source). Keys of the old layout that disappear are removed, not left behind. The strings stay in the lazy poker file so the landing page and boards pay nothing; `pt()` applies `pseudolocalize` when `pseudoLocale` is on (D30), so `?lang=pseudo` lengthens them by about 40%. No control is wider than its box in fr, en or pseudo at 360, 390, 768 and 1440 px, with 24-character names and 8 voters; a seat name ellipsizes, a hint wraps to two lines at most, a button label is short enough to stay on one line at 44 px.

New or changed keys (names only; the texts are written in the tasks): `poker.bar.*` (round, status lines), `poker.invite.*`, `poker.seat.*` (voted, waiting, watching, moderator, you), `poker.hint.*` (the hints above), `poker.results.*` (average, median, consensus levels, highest, lowest, use, estimate, no numbers), `poker.menu.*`, `poker.name.*`, `poker.start.*`, `poker.colours.*`.

## Wireframes

ASCII, drawn at 40 columns for a 390 px phone and 78 for the wider classes. `(MA)` is an avatar, `[bk]` a card back, `[  ]` an empty slot, `[8]` a face-up card, `<v>` a check, `<c>` a clock, `<k>` the crown, `<up>` the highest-card icon.

### Phone, lobby (alone)

```
+--------------------------------------+
| (<) Round 1                  (+) (...)|   bar 56: back, round + status, Invite, menu
|     Waiting for your team            |   status line
+--------------------------------------+
|                                      |
|    +--------+      +- - - - -+       |   middle region
|    | <k> (MA)|     |   (+)   |       |   my seat (you ring, crown) and the ghost seat
|    |  [  ]  |      |         |       |
|    | Malaka |      | Invite  |       |
|    +--------+      +- - - - -+       |
|                                      |
|     Share the link, then pick a card.|   the one hint
|                                      |
+--------------------------------------+
|  [ (+) Invite your team ]            |   filled, 48 px
|  [0][1][2][3][5][8][13]              |   dock: the hand, 7 + 6, 46x64
|  [21][34][55][89][?][cup]            |
+--------------------------------------+
```

### Phone, voting (six voters, two have voted, I have not)

```
+--------------------------------------+
| (<) Round 2                  (+) (...)|
|     2 of 6 voted                     |
+--------------------------------------+
| +------+ +------+ +------+ +------+  |
| | (MA) | | (AN) | | (BO) | | (CY) |  |   avatar
| | [bk] | | [  ] | | [bk] | | [  ] |  |   back = voted, slot = waiting
| | <v>  | | <c>  | | <v>  | | <c>  |  |   state icon (hidden word on each)
| |Malaka| | Ann  | | Bob  | | Cy   |  |
| +------+ +------+ +------+ +------+  |
| | (DE) | | (EL) |                    |
| | [  ] | | [  ] |                    |
| | <c>  | | <c>  |                    |
| | Dee  | | Eli  |                    |
| +------+ +------+                    |
+--------------------------------------+
|  [ (eye) Reveal ]                    |   moderator only, filled, 48 px
|  [0][1][2][3][5][8][13]              |   hand
|  [21][34][55][89][?][cup]            |
+--------------------------------------+
```

### Phone, waiting for others (I chose 8, four of six voted)

```
+--------------------------------------+
| (<) Round 2                  (+) (...)|
|     4 of 6 voted                     |
+--------------------------------------+
| +------+ +------+ +------+ +------+  |
| | (MA) | | (AN) | | (BO) | | (CY) |  |
| | [bk] | | [bk] | | [bk] | | [bk] |  |   four backs: voted
| +------+ +------+ +------+ +------+  |
| | (DE) | | (EL) |                    |
| | [  ] | | [  ] |                    |   two slots: waiting
| +------+ +------+                    |
|     Waiting for Dee and Eli.         |   the one hint
+--------------------------------------+
|  [ (eye) Reveal ]                    |   moderator only
|  [0][1][2][3][5][ 8 ][13]            |   the 8 lifted, ringed, with a check badge
|  [21][34][55][89][?][cup]            |
+--------------------------------------+
```

### Phone, revealed (moderator, six voters, no agreement)

```
+--------------------------------------+
| (<) Round 2                  (+) (...)|
|     Revealed                         |
+--------------------------------------+
| +------+ +------+ +------+ +------+  |
| | (MA) | | (AN) | | (BO) | | (CY) |  |
| | [ 8] | | [ 5] | | [ 5] | | [13] |  |   face-up, value once
| |Malaka| | Ann  | | Bob  | | Cy<up>|  |   highest-card icon on Cy
| +------+ +------+ +------+ +------+  |
| | (DE) | | (EL) |                    |
| | [ 5] | | [ ?] |                    |
| +------+ +------+                    |
| +----------------------------------+ |
| | Average 7.2        Median 5      | |   two large numbers
| | Some agreement [=====-----] 50%  | |   consensus meter with words
| |      3                           | |
| |      #     1     1     1         | |   distribution, a bar per card with its count
| |      5     8    13     ?         | |
| | <up> Highest: 13 (Cy)            | |   outliers: icon and words
| | [ (check) Use 5 ]                | |   quiet pill
| +----------------------------------+ |
+--------------------------------------+
|  [ (undo) Vote again ]  [ Next round ]|  filled = Vote again (the room disagrees)
+--------------------------------------+
```

A voter sees the same, with no Use button ("Suggested: 5") and, instead of the two buttons, the one hint "Malaka starts the next round."

### Phone, between rounds (Next round pressed)

```
+--------------------------------------+
| (<) Round 3                  (+) (...)|   "Round 3, vote again" when it is a re-vote
|     0 of 6 voted                     |
+--------------------------------------+
| seats back to empty slots, results   |
| gone, the estimate of round 2 gone   |
+--------------------------------------+
|  [0][1][2][3][5][8][13]              |   the hand is back, nothing chosen
|  [21][34][55][89][?][cup]            |
+--------------------------------------+
```

The change is announced once to assistive technology ("Round 3. Pick a card."); the hand returns with a 150 ms rise (none under reduced motion); the seats clear without animation.

### Tablet 768x1024, voting (six voters, four voted)

```
+----------------------------------------------------------------------+
| (<) Round 2  -  4 of 6 voted                         (+) Invite  (...)|
+----------------------------------------------------------------------+
|                                                                      |
|                  [bk]                          [bk]                  |
|                 (Ann) <v>                    (Bob) <v>               |
|        [  ]                                                  [bk]   |
|       (Eli) <c>      +--------------------------+           (Cy) <v> |
|                      |        Round 2           |                    |
|                      |       4 of 6 voted       |                    |
|                      |      [ (eye) Reveal ]    |   <- the primary lives in the table
|        [  ]          +--------------------------+           [  ]    |
|       (Dee) <c>                                              (Fay) <c>|
|                                [bk]                                  |
|                           <k> (Malaka) <v>                            |
|                                                                      |
+----------------------------------------------------------------------+
|      [0] [1] [2] [3] [5] [8] [13] [21] [34] [55] [89] [?] [cup]      |   hand, 60x84, wraps to a second row if needed
+----------------------------------------------------------------------+
```

### Tablet 768x1024, revealed

```
+----------------------------------------------------------------------+
| (<) Round 2  -  Revealed                             (+) Invite  (...)|
+----------------------------------------------------------------------+
|        [ 5 ]            [ 5 ]                                        |
|       (Ann)            (Bob)           [ 8 ]  oval table, smaller     |
|  [ ? ]        +---------------+       (Malaka)   [13]                |
| (Eli)         |   Round 2     |                  (Cy)<up>            |
|               +---------------+                                      |
|        [ 5 ]                 [ 5 ]                                    |
|       (Dee)                  (Fay)                                    |
+---------------------------------+------------------------------------+
| Average 7.2     Median 5        |   3                                 |
| Some agreement [=====----] 50%  |   #     1     1     1               |
| <up> Highest: 13 (Cy)           |   5     8    13     ?               |
| [ (check) Use 5 ]               |                                     |
+---------------------------------+------------------------------------+
|              [ (undo) Vote again ]     [ Next round ]                |
+----------------------------------------------------------------------+
```

### Laptop 1280x800, lobby

```
+--------------------------------------------------------------------------------+
| (<) Round 1  -  Waiting for your team                       (+) Invite   (...) |
+--------------------------------------------------------------------------------+
|                                                                                |
|                          +- - - - -+                                           |
|                          |  (+)    |  ghost seat: Invite                       |
|                          +- - - - -+                                           |
|                 +------------------------------+                               |
|                 |      Share the link,         |                               |
|                 |      then pick a card.       |                               |
|                 |     [ (+) Invite your team ] |   filled                      |
|                 +------------------------------+                               |
|                          [bk or slot]                                          |
|                          <k> (Malaka)                                          |
+--------------------------------------------------------------------------------+
|        [0] [1] [2] [3] [5] [8] [13] [21] [34] [55] [89] [?] [cup]              |   72x100
+--------------------------------------------------------------------------------+
```

### Laptop 1280x800, voting and waiting

```
+--------------------------------------------------------------------------------+
| (<) Round 2  -  4 of 6 voted                                (+) Invite   (...) |
+--------------------------------------------------------------------------------+
|                   [bk](Ann)<v>            [bk](Bob)<v>        |  Round 2       |
|        [  ](Eli)<c>      +----------------------+   [bk](Cy)<v>|  4 of 6 voted  |
|                          |   Round 2            |              |                |
|                          |   [ (eye) Reveal ]   |              |  Waiting for   |
|        [  ](Dee)<c>      +----------------------+  [  ](Fay)<c>|  Dee and Eli.  |
|                              [bk] <k>(Malaka)<v>               |                |
+--------------------------------------------------------------------------------+
|        [0] [1] [2] [3] [5] [ 8 ] [13] [21] [34] [55] [89] [?] [cup]            |
+--------------------------------------------------------------------------------+
```

### Laptop 1280x800, revealed

```
+--------------------------------------------------------------------------------+
| (<) Round 2  -  Revealed                                    (+) Invite   (...) |
+--------------------------------------------------------------------------------+
|                   [ 5 ](Ann)             [ 5 ](Bob)         | Average   Median |
|        [ ? ](Eli)        +----------------------+  [13](Cy)<up>   7.2      5  |
|                          |   Round 2            |            | Some agreement   |
|                          +----------------------+            | [====-----] 50%  |
|        [ 5 ](Dee)                                [ 5 ](Fay)  |   3              |
|                              [ 8 ] (Malaka)                  |   #   1  1  1    |
|                                                              |   5   8 13  ?    |
|                                                              | <up> Highest: 13 |
|                                                              | [ (check) Use 5 ]|
+--------------------------------------------------------------------------------+
|                   [ (undo) Vote again ]      [ Next round ]                    |
+--------------------------------------------------------------------------------+
```

### TV 2560x1440, revealed

The same layout as the laptop, with the table, cards, avatars, numbers and results text at 1.5 times (type scale), the bar and the menu at their normal size. A room on a TV usually belongs to a person who only watches: no dock, a larger table and the results panel at the right (the numbers at about 96 px).

```
+--------------------------------------------------------------------------------------------+
| (<) Round 2 - Revealed                                                 (+) Invite     (...) |   chrome: unchanged size
+--------------------------------------------------------------------------------------------+
|                                                                       |                    |
|            [  5  ](Ann)              [  5  ](Bob)                     |   Average  Median  |
|    [  ?  ](Eli)       +--------------------------+   [ 13 ](Cy)<up>  |    7.2       5     |   content: x1.5
|                        |        Round 2           |                   |   Some agreement   |
|                        +--------------------------+                   |   [======----] 50% |
|    [  5  ](Dee)                           [  5  ](Fay)                |   distribution     |
|                       [  8  ](Malaka)                                 |   Highest: 13 (Cy) |
+--------------------------------------------------------------------------------------------+
```

## Where each new type lives

| Piece | Layer |
|---|---|
| `PokerCard`, `PokerSeat`, `PokerTable` (grid and oval), `PokerHand`, `PokerDock`, `PokerResults` with `ConsensusMeter` and `CardDistribution`, `RoomBar`, `InviteSheet`; the start page and the name step | `apps/web/app/components/poker/`, `apps/web/app/pages/poker/` (UI only; Vue and CSS) |
| Strings fr and en | `apps/web/app/poker/strings.ts` (lazy, with the poker pages) |
| `consensusLevel(stats)` (the four words), `outliers(stats, picks)` (lowest and highest cards that are not the most chosen, with their voters) | `packages/application/src/estimation/` (pure, next to `statistics.ts`) |
| `estimate.decide { round, card }` `Round.decided`, the privilege check, the replay | `packages/domain/src/estimation/poker.ts`; the wire bodies in `packages/protocol/` (an older client keeps and forwards an unknown body, as the poker body already does) |
| The view model (`SeatView`, `RoundView`, the outliers, the decision) | `apps/web/app/poker/client.ts` |
| The pseudo-locale in `pt()` | `apps/web/app/poker/strings.ts`, using `pseudolocalize` of `@retroboard/i18n` |

No new package, no new dependency: the oval, the flip, the lattice and the distribution are CSS and Vue; the QR code is the existing component. The relay, the transport, the envelope and the sealed ballots are not touched.

## Security and privacy note

The change removes a leak: the invite link, whose fragment holds the room key, no longer sits in a text field on every room page and on every shared or projected screen (D33); it is shown only in the Invite sheet, as a QR code and through Copy, as the board's share dialog already does. The seat renders no value before the reveal (the DOM holds the face only after it), so the interface cannot show a card early, and a stuck animation cannot either. What the relay sees does not change: the new event (`estimate.decide`) is a sealed envelope of five fields like the others, one per round. Nothing new is stored on the device beyond the settings that exist (language, variant). No third party, no analytics, no remote font or image: the card backs are CSS gradients.

## Impact on the free plan

One small event more: `estimate.decide` (at most one per round). A 20-voter hour of about 1,170 events grows by the number of rounds (tens). The budget of ADR-0042 is not affected.

## Risks and open points

- Overlap with `scrum-poker`: tasks 3.1 (table, seats, hand, reveal) and 3.2 (results panel) of that change describe what this one designs. They are delivered through the tasks here; the parts of 3.2 that are not visual (the "please explain" timer) stay there. The other changes of that epic (stories, decks, export) are not touched.
- The adaptive emphasis of Vote again and Next round (K9) is the one clever rule; the fallback is written in K9.
- The oval needs `cos()` and `sin()` in CSS (Baseline 2023 in Chrome, Safari and Firefox); the phone grid is the fallback.
- The card back is a lattice of two token colours; in a theme whose `--accent` and `--surface` are close the lattice would be faint. The review of the nine themes (task 6.1, `after-group-6/card-backs-nine-themes.webp`, light and dark) found a lattice that is clearly visible in every one, framed by an edge that keeps 3:1 (the contrast spec `tests/e2e/poker-themes.spec.ts` measures it). Two sets of backs look alike because their accents do: Studio, Corporate and Slate (three blues) and Paper and Halloween (two oranges). A room has one imposed theme and a person never sees two themes at once, so no theme needs its own token, and a moderator who wants a different back picks one of the eight hues of "Card colours". No theme file is changed by this change.
- A deck of more than 14 cards on a phone is a sideways row, which hides some cards; it only concerns custom decks of 15 to 24 cards, and keyboard names and arrow keys reach every card.
- Eight voters on a 360x640 phone are tight (K1 budget: 146 px of slack while voting and 38 px, or 16 with two outlier lines, once revealed at 640, against 170 and 62, or 40, at 664). If review finds it too tight, the seat becomes avatar-only at 360 px, never a scrolling page.
- Not decided here, and left to later changes: stories and the round history strip, the short code in the Invite sheet, "everyone moderates", choosing another card than the suggestion, sound, emoji throws.
