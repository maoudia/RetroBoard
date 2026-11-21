## ADDED Requirements

### Requirement: One viewport on a phone
On a phone (under 600 px wide) the room SHALL be a bar, a middle region and a dock over the dynamic viewport, and the page SHALL NOT scroll. For up to 8 voters, in every state (lobby, voting, waiting, revealed, between rounds), the room SHALL fit 390x664 and 360x640 without the middle region scrolling; for 9 to 20 voters only the middle region SHALL scroll.

#### Scenario: Eight voters, every state
- **WHEN** a room of 8 voters with 24-character names is open on a 390x664 phone, before voting, with some voted and after the reveal
- **THEN** the document does not scroll, the middle region's scroll height is not above its client height, and the bar, every seat and the dock are inside the viewport

#### Scenario: A small phone in French
- **WHEN** the same room is open on a 360x640 phone in French
- **THEN** the page does not scroll and the dock is inside the viewport

#### Scenario: Twenty voters
- **WHEN** 20 voters are seated on a 390x664 phone
- **THEN** the middle region scrolls on its own and the bar and the dock do not move

### Requirement: The hand lives in the thumb zone
While a round is open a voter's hand SHALL be in the dock at the bottom of the screen, above the safe-area inset on a phone, inside the viewport and in the same place in every state where it shows. Every card SHALL be at least 44x44 px and at least 6 px from the next, and the hand SHALL NOT overflow the page sideways.

#### Scenario: Open round on a phone
- **WHEN** a voter on a 390x664 phone looks at an open round with a 13-card deck
- **THEN** every card is visible at once in two rows at the bottom of the screen, each at least 44x44 px

#### Scenario: Nothing hidden behind the hand
- **WHEN** the hand is shown on a phone
- **THEN** it does not overlap any seat or text of the middle region

#### Scenario: Same place in every state
- **WHEN** a voter goes from not voted to voted, and to a new round
- **THEN** the hand's box does not move

### Requirement: A deck wraps or scrolls
A deck of up to 14 cards SHALL wrap in centred rows. A custom deck of 15 to 24 cards SHALL be one row that scrolls sideways with snapping, with the chosen card scrolled into view.

#### Scenario: Thirteen cards
- **WHEN** the deck is Fibonacci with the coffee card on a 390 px phone
- **THEN** the cards wrap in rows of 7 and 6, centred

#### Scenario: Twenty cards
- **WHEN** a room has a custom deck of 20 cards on a phone
- **THEN** the hand is one row that snaps to cards, and every card is reachable by touch, by the arrow keys and by typing its name

### Requirement: The dock holds only what can be tapped
The dock SHALL hold what this person can act on in this state and nothing else: the hand and, for the moderator, Reveal once a card is in; after the reveal, Vote again and Next round for the moderator and at most one line of text for a voter. An observer SHALL have no dock. After the reveal the hand SHALL leave the dock instead of fading.

#### Scenario: After the reveal, a moderator
- **WHEN** the round is revealed and the person is the moderator
- **THEN** the dock shows Vote again and Next round and no hand, and both buttons are inside the viewport

#### Scenario: After the reveal, a voter
- **WHEN** the round is revealed and the person is not the moderator
- **THEN** the dock shows one hint line and no control, and the person's own card is face up on their seat

#### Scenario: An observer
- **WHEN** a person joins a full room as an observer
- **THEN** there is no hand and no dock, and the status line says they are watching

### Requirement: Cards look like playing cards
Every card of the room SHALL be drawn by one component with a 5:7 ratio: a face with the value large and centred and small corner values (top left, and bottom right turned 180 degrees), and a back with a pattern made only from the theme's tokens and carrying no text. A card SHALL NOT use the pill radius or a hard-coded colour.

#### Scenario: Face and back
- **WHEN** a revealed card and a face-down card are shown
- **THEN** the face shows its value large in the centre and twice small in two corners, the back shows a pattern and no text, and neither has a pill radius

#### Scenario: Themes
- **WHEN** the room is shown in each of the nine themes
- **THEN** each card back has the look of its theme because it uses `--accent` and `--surface`, and no theme file contains card styles

### Requirement: The chosen card and the empty slot are shapes
The chosen card of a hand SHALL be shown by shape (lifted, ringed, with a check badge) and not by colour alone, SHALL keep the contrast of the face and SHALL NOT be dimmed. An empty slot SHALL be a dashed edge with a clock icon and an edge of at least 3:1 contrast.

#### Scenario: Chosen card, no colour
- **WHEN** a voter picks the 8 and the page is rendered in greyscale
- **THEN** the 8 is still the only card that is lifted, ringed and checked, and its value reads at 4.5:1 or better

#### Scenario: Picking is quick
- **WHEN** a voter picks a card
- **THEN** the lift animates for at most 150 ms, and not at all under reduced motion

#### Scenario: Waiting seat
- **WHEN** a voter has not chosen
- **THEN** their seat shows a dashed empty slot with a clock icon whose edge has at least 3:1 contrast against its surface in every theme

### Requirement: The reveal flips the cards quickly, or not at all
On the reveal every seat's card SHALL turn from back to face in 280 ms, all starting within 60 ms of each other, so that none is turning 400 ms after the reveal. Under reduced motion, from the system preference or the application setting, there SHALL be no animation. The value of a card SHALL NOT be in the page before the reveal.

#### Scenario: Timing
- **WHEN** a moderator reveals a round of 8 cards
- **THEN** every flip lasts 280 ms, the last starts no later than 60 ms after the first, and none is running after 400 ms

#### Scenario: Reduced motion
- **WHEN** the person prefers reduced motion and the round is revealed
- **THEN** the page has no running animation and the faces are visible at once

#### Scenario: Nothing early
- **WHEN** a round is open and three of four voters have chosen
- **THEN** no element of the page contains any voter's card value, in the document or in an attribute

### Requirement: Seats show state without showing cards
Each seat SHALL show an avatar, the name on one line with an ellipsis, a card slot, the role as an icon with an accessible name and the state as an icon with an accessible name (Voted, Waiting, Watching). Before the reveal a voted seat SHALL show a card back and a waiting seat an empty slot; after it, the face once. A seat SHALL NOT show a value twice.

#### Scenario: Voted and waiting
- **WHEN** two of three voters have chosen
- **THEN** two seats show a card back with a check and one shows an empty slot with a clock, and a screen reader announces each as the name followed by "voted" or "waiting"

#### Scenario: A long name
- **WHEN** a person is called "Maximilienne-Alexandra Durand"
- **THEN** the seat shows one line with an ellipsis, its height equals the other seats' and the full name is its accessible name

#### Scenario: After the reveal
- **WHEN** the round is revealed
- **THEN** each seat shows its card face once and no caption repeats the value

#### Scenario: The person's own seat
- **WHEN** the room is shown to a person
- **THEN** their avatar has a ring and a hidden word "you", and a moderator's seat has a crown icon named "Moderator"

### Requirement: A table on larger screens
From 600 px wide the seats SHALL sit around an oval table, the person at the bottom centre and the others clockwise in join order, by CSS alone with the DOM kept in join order. For up to 20 seats none SHALL overlap another or leave the stage; where the browser cannot place by trigonometric functions the phone grid SHALL be used.

#### Scenario: Six voters on a tablet
- **WHEN** six voters are seated on a 768x1024 screen
- **THEN** their seats lie on an ellipse around the table, the person's seat is at the bottom centre, the round and the primary action are in the middle of the table and no seats overlap

#### Scenario: Seat sizes by count
- **WHEN** the room has up to 8, 9 to 14, or 15 to 20 seats
- **THEN** the seats are 96, 80 and 64 px (before the type scale)

#### Scenario: Twenty voters on a laptop
- **WHEN** 20 voters are seated on a 1280x800 screen
- **THEN** none overlaps another or leaves the stage, and the hand is inside the viewport

### Requirement: Results lead with two numbers and a verdict
After the reveal the room SHALL show the average and the median as two large numbers and a consensus meter with words for the share of the cards cast on the most chosen card: Everyone agrees at 100%, Strong agreement from 75%, Some agreement from 50%, No agreement yet below. The meter SHALL be exposed as a meter whose text is its words.

#### Scenario: Divergent round
- **WHEN** six voters play 8, 5, 5, 13, 5 and ?
- **THEN** the average is 7.2 and the median 5 in large type and the meter reads "Some agreement" and 50%

#### Scenario: One voter
- **WHEN** one voter has played 8
- **THEN** the results show the average and the median and "Everyone agrees"

#### Scenario: Ordinal deck
- **WHEN** the deck is T-shirt sizes and the cards are S, M, M, L
- **THEN** the median is shown as the card M, no average is shown, and the meter is shown

### Requirement: Results show the distribution
The room SHALL show a distribution with one column per chosen card in deck order, its count above and its height proportional to the count, exposed as a list. Cards that are not numeric SHALL be counted in it and kept out of the average and the median. No number SHALL appear twice, and the most chosen card and the spread SHALL NOT be repeated as separate facts.

#### Scenario: The same round
- **WHEN** six voters play 8, 5, 5, 13, 5 and ?
- **THEN** the distribution has columns 5 (3), 8 (1), 13 (1) and ? (1), each with its count as text

#### Scenario: Not by colour
- **WHEN** the results are read by a screen reader or in greyscale
- **THEN** the consensus is given in words and every column has its count as text

#### Scenario: Only question marks
- **WHEN** every card of the round is "?"
- **THEN** the distribution shows one column, no average, median or suggestion is shown, and the results say there is no numbered card

### Requirement: Outliers are marked
The lowest and the highest card that is not the most chosen card SHALL be marked as outliers with an icon and words, on their seats and in the results, when the spread exceeds one step of the deck. With one voter, or when everybody agrees, there SHALL be none.

#### Scenario: A high card
- **WHEN** six voters play 8, 5, 5, 13, 5 and ?
- **THEN** "Highest: 13 (Cy)" is shown with its icon and Cy's seat carries the same icon, and the lowest card is not marked because 5 is the most chosen card

#### Scenario: Agreement
- **WHEN** every voter plays 8
- **THEN** no outlier line and no outlier icon are shown

### Requirement: The suggested card is an action
For the moderator the suggested card SHALL be a button "Use" followed by the card ("Use 5") that records it as the estimate of the round, which everybody then sees as "Estimate 5" with a check icon; a new round SHALL clear it. A voter SHALL see the suggestion as text. The suggestion SHALL NOT be applied by itself, look like an input, or be offered without a numeric or median card.

#### Scenario: Use the suggestion
- **WHEN** the moderator presses "Use 5" on a revealed round
- **THEN** every participant sees "Estimate 5" and the moderator's button is gone

#### Scenario: A voter
- **WHEN** a voter looks at a revealed round
- **THEN** the suggestion is text and there is no button

#### Scenario: Next round clears it
- **WHEN** the moderator opens the next round
- **THEN** no estimate is shown

### Requirement: The estimate is the moderator's alone
Every replica SHALL accept the decision of an estimate only from the moderator, once per revealed round, and only for a card of the deck, and SHALL ignore any other.

#### Scenario: A voter cannot decide
- **WHEN** a voter sends the decision of a round
- **THEN** every replica ignores it

#### Scenario: A card that is not in the deck
- **WHEN** the moderator's decision names a card that is not in the deck
- **THEN** every replica ignores it

### Requirement: At most one filled button
A person SHALL see at most one filled button in the room, and a voter none. Every labelled button SHALL have an icon at its left and a height of at least 44 px, 48 px for the primary on a phone. Language, light or dark and the way back to RetroBoard SHALL be in the overflow menu, not in the dock or the page.

#### Scenario: Count of filled buttons
- **WHEN** any state is shown to any role
- **THEN** it has at most one filled button and every labelled button has an icon and at least 44 px

#### Scenario: The overflow menu
- **WHEN** a person opens the overflow menu
- **THEN** it offers the language, light or dark and the way back, and the choice of light or dark persists on this device

### Requirement: The moderator's filled button follows the state
The moderator's filled button SHALL be Invite when alone and no card is in, Reveal once a card is in and the round is not revealed, and after the reveal Next round when the agreement is strong or full and Vote again when it is some or none. Vote again SHALL stay on the left and Next round on the right, the other being quiet, and neither SHALL glow.

#### Scenario: Strong agreement
- **WHEN** the round is revealed with at least 75% of the cards on one card
- **THEN** Next round is filled, Vote again is quiet and "Use 5" is quiet

#### Scenario: Disagreement
- **WHEN** the round is revealed with under 75% on the most chosen card
- **THEN** Vote again is filled and Next round is quiet, in the same places as before

#### Scenario: Alone
- **WHEN** the moderator is alone and no card is in
- **THEN** the filled button is Invite, and Reveal appears in its place with the first card

### Requirement: Invite in a sheet, never in the page
The room page SHALL NOT print its invite link or room key. An Invite button in the bar, the lobby's filled button and a ghost seat shown when alone SHALL open one sheet with the QR code of the participant link, a filled Copy link button that copies without displaying the address, Share where the browser offers it, and one muted line; closing it SHALL return the focus to the opener.

#### Scenario: Nothing printed
- **WHEN** the room is open and the sheet is closed
- **THEN** no element of the page contains the room link or any part of its fragment

#### Scenario: Copy
- **WHEN** a person opens the sheet and presses "Copy link"
- **THEN** the participant link, never carrying the moderator secret, is on the clipboard, the button says it was copied, and the address is not shown

#### Scenario: Focus
- **WHEN** the sheet is closed with Escape
- **THEN** the focus is back on the control that opened it

### Requirement: One status line and one hint
The room SHALL show one status line under the round ("2 of 6 voted", "Revealed", "Watching", "Reconnecting...", "The room is full") and SHALL NOT say "Connected", at most one muted hint line chosen by state and role, and no visible heading for the table, the hand or the results.

#### Scenario: Normal state
- **WHEN** the connection is live
- **THEN** the page does not say that it is connected

#### Scenario: One hint
- **WHEN** a voter has chosen and two voters are missing
- **THEN** the only hint is "Waiting for Dee and Eli." and no second muted line is shown

### Requirement: State changes are announced
The regions of the room SHALL be named for assistive technology, and the changes of state SHALL be announced politely, once each: the voted count, the reveal with the average, the median and the verdict, and the new round.

#### Scenario: Announcements
- **WHEN** a round is revealed and the next one is opened
- **THEN** a screen reader hears "Cards revealed. Average 7.2, median 5. Some agreement.", then "Round 3. Pick a card.", each once

### Requirement: The start page is one decision and one button
The start page SHALL offer a headline with the Beta tag once, one lead line, deck chips with Fibonacci chosen, the deck shown as round chips, a typed list only when Custom is chosen, one muted privacy line and one filled "Create the room" button fixed at the bottom of a phone and at least 48 px high. Creating SHALL take one press.

#### Scenario: One press
- **WHEN** a visitor opens `/poker` and presses "Create the room"
- **THEN** the room opens with the Fibonacci deck and asks for a name

#### Scenario: A preset fills the chips
- **WHEN** the visitor chooses T-shirt
- **THEN** the round chips show XS, S, M, L, XL, XXL and ?, and no typed field is shown

#### Scenario: A custom deck
- **WHEN** the visitor chooses Custom and types "1, 2, 4, 8, ?"
- **THEN** the round chips show exactly those cards, and a list with a duplicate or a card of 7 characters is refused with a message and cannot be created

### Requirement: Card colours are shown only when they work
A collapsed "Card colours" section SHALL be shown on the start page only once it has swatches, and the hue the moderator picks SHALL set the card backs of the room for everybody.

#### Scenario: A hue
- **WHEN** the moderator picks a hue before creating the room
- **THEN** the card backs of the room use that hue for everybody, and the section shows a live card back

#### Scenario: Not yet available
- **WHEN** the swatches are not implemented
- **THEN** the start page has no "Card colours" section

### Requirement: The name step has the look of the start page
The name step SHALL have one field prefilled with the name this browser uses, one muted line, and one filled "Join the room" button fixed at the bottom of a phone and at least 48 px high.

#### Scenario: Prefilled
- **WHEN** this browser has a name for boards
- **THEN** the field shows it and one press on "Join the room" joins

### Requirement: Content scales on a TV, chrome does not
On the wide and TV screen classes the sizes of the table, seats, avatars, cards, numbers and results text SHALL be multiplied by the type scale (1.125 and 1.5), while the bar, the menus and the sheets keep their sizes and their 44 px targets. A person who only watches SHALL see a larger table and no dock.

#### Scenario: TV
- **WHEN** the room is shown at 2560x1440
- **THEN** a card is 1.5 times the size of the same card on a laptop, and the bar's height and button sizes are unchanged

#### Scenario: Watching
- **WHEN** an observer opens the room on a TV
- **THEN** the table is larger and there is no dock

### Requirement: Results sit beside or under the table
On a laptop and wider the results SHALL sit beside the table; on a tablet in portrait they SHALL sit under it after the reveal. The page SHALL NOT scroll in any state on these screens, and the hand and the dock SHALL be inside the viewport.

#### Scenario: Laptop
- **WHEN** the room is revealed at 1280x800
- **THEN** the table is at the left, the results at the right and the dock under both, with no page scroll

#### Scenario: Tablet in portrait
- **WHEN** the room is revealed at 768x1024
- **THEN** the results are under the table and the dock is inside the viewport

### Requirement: WCAG 2.2 AA in nine themes
Every screen of the poker pages (start, name, lobby, voting, waiting, revealed) SHALL meet WCAG 2.2 AA in each of the nine themes in light and dark and pass axe, with every text, card edge and slot edge contrast measured. No component SHALL contain a hard-coded colour, a literal font size or an off-scale radius.

#### Scenario: Contrast
- **WHEN** the contrast spec runs the room in each of the nine themes in light and dark
- **THEN** no text is under 4.5:1 (3:1 for large text) and no card or slot edge is under 3:1

#### Scenario: Token audit
- **WHEN** the design-token test scans the poker components
- **THEN** it finds no hex colour, no off-scale font size and no off-scale radius

### Requirement: Keyboard, focus and forced colours
The hand SHALL be a radio group operated with the arrow keys and by the typed names of cards (5, 1 then 3 for 13, ?); the focus order SHALL be the bar, the seats, the results and the dock; every control SHALL show a focus ring and have a 44 px target; under forced colours the edges and the chosen card SHALL stay visible.

#### Scenario: Keyboard only
- **WHEN** a person plays a round with the keyboard only
- **THEN** they move through the hand with the arrow keys, pick a card, reach Reveal, hear the reveal announced and read the results in the focus order above

#### Scenario: Forced colours
- **WHEN** the page is shown with forced colours
- **THEN** the card edges and the chosen card are still visible

### Requirement: Language, length and the pseudo-locale
Every string of the poker pages SHALL have an `fr` and an `en` key, French being the source, and `?lang=pseudo` SHALL lengthen them like every other page. Nothing SHALL overflow sideways and no control SHALL be cut off at 360, 390, 768 and 1440 px in French, English and the pseudo-locale, with 24-character names and 8 voters.

#### Scenario: Pseudo-locale
- **WHEN** `/poker?lang=pseudo` and a room with `?lang=pseudo` are opened
- **THEN** the poker strings are lengthened by about 40% and the overflow spec finds nothing wider than its box

#### Scenario: French on a small phone
- **WHEN** the room is revealed in French on a 360x640 phone with 8 voters
- **THEN** the results fit as in English and no label is cut
