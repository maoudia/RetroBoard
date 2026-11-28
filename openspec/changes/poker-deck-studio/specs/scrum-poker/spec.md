## ADDED Requirements

### Requirement: A card shows where it sits on the scale
A card of a scale SHALL be drawn in two zones that never overlap: a picture of its place on the scale, derived from its rank among the scale cards and from the look of the deck, and its label, which is always present. The label SHALL be the card's accessible name and the picture SHALL be decorative and SHALL add no information the label does not give. A special card SHALL be drawn as its glyph alone, with its word as accessible name.

#### Scenario: Bigger looks bigger
- **WHEN** the Fibonacci deck is shown with the Spiral look
- **THEN** the picture of each scale card contains the picture of the card before it, and the 13 shows a larger tiling than the 8

#### Scenario: The label carries everything
- **WHEN** a card is read by a screen reader, shown in greyscale, or shown with forced colours
- **THEN** its label is present and sufficient, the picture is hidden from assistive technology, and nothing the picture said is lost

#### Scenario: Pictures by rank
- **WHEN** a custom deck "1, 2, 4, 5, 20" wears the Cairn look
- **THEN** its five cards are drawn with 1 to 7 stones by rank, evenly, and each label is unchanged

#### Scenario: Two zones
- **WHEN** a card is shown at 46 px and at 72 px wide
- **THEN** the picture and the label occupy separate zones, the label reads at 4.5:1 or better, and corner values are present only from 56 px

### Requirement: Plain cards on request
A person SHALL be able to turn the pictures off for themselves. The cards on their screen SHALL then be drawn with the plain look (the label alone), and the room's deck, its look and what other people see SHALL NOT change.

#### Scenario: Plain for me
- **WHEN** a person turns on "Plain cards" in a room whose deck has the Spiral look
- **THEN** their cards show labels only, and another participant still sees the pictures

### Requirement: Seven deck families
The room SHALL offer seven decks, each with its own look and its default special cards: Fibonacci with the Spiral look, modified Fibonacci with Cairn, T-shirt sizes with Tee, powers of two with Doubles, complexity (1 to 5) with Peaks, time (hours, days, weeks) with Hourglass, and confidence (1 to 5) with Focus. Every picture SHALL be generated from tokens and inline vector paths, with no image file, no remote asset and no hard-coded colour.

#### Scenario: The presets
- **WHEN** the gallery is opened
- **THEN** it offers the seven decks in that order, Fibonacci chosen, each with its look, and the first card of the Fibonacci deck is 0 and the last is 89

#### Scenario: Doubling is the picture
- **WHEN** the Doubles card 16 and the card 8 are compared
- **THEN** the 16 fills twice as many cells of the grid as the 8

#### Scenario: A deck wears any look
- **WHEN** a custom deck is given the Hourglass look
- **THEN** each scale card shows its share of sand by rank, whatever its label

#### Scenario: No image
- **WHEN** the poker pages are built
- **THEN** no card picture is an image file, a remote asset or a data URI, and the glyphs are paths drawn with theme tokens

### Requirement: Special cards replace the coffee card
A deck SHALL be able to contain these special cards, in this fixed order after its scale: "Need more information" (the `?` card), "Pass", "Split it" and "Already known". The coffee card SHALL NOT be offered in any preset, in the builder or in the special-card toggles. A room that already has the coffee card SHALL keep it, drawn as a retired special card named "Break".

#### Scenario: Preset special cards
- **WHEN** the Fibonacci deck is chosen
- **THEN** its special cards are "Need more information" and "Split it", and the coffee card is not among its cards

#### Scenario: Adding Pass
- **WHEN** a moderator turns on "Pass" in the special cards before creating the room
- **THEN** the hand shows the scale, then Need more information, Split it and Pass, in the fixed order

#### Scenario: An older room
- **WHEN** a room created before this change is opened and its deck contains the coffee card
- **THEN** the card still plays, is drawn by the special-card family and is named "Break", and it is counted as a card that is not a number

### Requirement: Special cards count in their own way
The results SHALL keep every special card out of the average, the median, the mode, the spread and the suggestion. A Pass SHALL count as a ballot (the automatic reveal does not wait for it) and SHALL NOT count as a card cast; Need more information, Split it and Already known SHALL count as cards cast. The results SHALL name who played each special card.

#### Scenario: Names of the cards
- **WHEN** six voters play 8, 5, 5, ?, 13 and Pass
- **THEN** five cards are cast, the average and median are those of 8, 5, 5 and 13, a line says who needs more information, a muted line says who passed, and the consensus is the share of the most chosen card among the five

#### Scenario: Pass does not delay the reveal
- **WHEN** every voter has played a card and one of them is Pass, and the automatic reveal is on
- **THEN** the round reveals, and the Pass is shown as a column with its count in the distribution

#### Scenario: Only special cards
- **WHEN** every card of the round is a special card
- **THEN** no average, median or suggestion is shown and the special lines are

### Requirement: A majority of special cards says so
When at least half of the cards cast are Split it or Already known, the verdict SHALL say so in words and the suggested card SHALL NOT be offered as an action.

#### Scenario: Most say split
- **WHEN** four of six voters play Split it
- **THEN** the verdict says most voters want to split the story, "Use" is not offered, and Vote again is the filled button

### Requirement: A look travels in its own command
The moderator SHALL write the look and the name of the deck with a command of its own, separate from the deck's labels, accepted only from the moderator, only for a known look and a name of at most 24 characters, applied from the next round, and frozen in each round when it opens. A client that does not know the command SHALL keep and forward it, fold nothing, and show plain cards with the right labels.

#### Scenario: Only the moderator
- **WHEN** a voter sends a deck look
- **THEN** every replica ignores it

#### Scenario: Frozen in the round
- **WHEN** the moderator changes the look while a round is open
- **THEN** the open round keeps its look and the next round uses the new one, on every replica

#### Scenario: An older client
- **WHEN** a client that does not know the look command is in the room
- **THEN** it reads the same cards as everybody, in the plain look, and its votes open to the same cards as before

#### Scenario: An older room
- **WHEN** a room whose rounds have no look is replayed
- **THEN** every such round is drawn with the plain look

### Requirement: Each theme has its own card skin
Every theme SHALL have a card skin that restyles the face and the back of every card: the edge, the corner, the back pattern, a tint of the face and the stroke of the pictures, made only from theme tokens. A theme with no skin SHALL fail the tests. In the nine themes, in light and dark, a card's edge and an empty slot's edge SHALL have a contrast of at least 3:1, a label 4.5:1, and the two tones of a back SHALL be told apart at 3:1.

#### Scenario: Nine themes, nine cards
- **WHEN** the same card back is shown in each of the nine themes
- **THEN** no two backs use the same pattern and corner and edge combination, and each uses only that theme's tokens

#### Scenario: A new theme
- **WHEN** a theme is added to the themes package without a card skin
- **THEN** a test fails and names the theme

#### Scenario: Contrast
- **WHEN** the contrast spec runs the hand, a seat and a card back in each theme in light and dark
- **THEN** no label is under 4.5:1 and no edge, slot edge or back tone pair is under 3:1

#### Scenario: A hue wins on the back
- **WHEN** the moderator has picked a card hue
- **THEN** the back keeps the pattern of the theme's skin and takes the hue as its colour

### Requirement: The deck gallery
The start page SHALL show the chosen deck as a large fan of five real cards with its name, one line of purpose and its count, and every deck as a small fan of three cards that can be tapped to choose it. The tiles SHALL be a radio group named by the deck's name, count and range, the chosen tile SHALL be shown by a ring, a check and a lifted fan, and Fibonacci SHALL be chosen by default so that creating a room takes one press.

#### Scenario: One press
- **WHEN** a visitor opens the start page and presses "Create the room"
- **THEN** the room opens with the Fibonacci deck in the Spiral look and asks for a name

#### Scenario: Tap to choose
- **WHEN** the visitor taps the T-shirt tile
- **THEN** the hero fan shows the cards XS, S, L, XL and XXL (the scale cards at the positions of the fan: the first, the second, the fourth, the fifth and the last of six), the tile is ringed and checked, and the room created next has the T-shirt deck

#### Scenario: Keyboard
- **WHEN** the visitor focuses the tiles and presses the arrow keys
- **THEN** the choice moves with the focus and is announced as the deck's name and card count, and Tab leaves the group

#### Scenario: Reduced motion
- **WHEN** the person prefers reduced motion and chooses another tile
- **THEN** the hero fan changes with no animation

#### Scenario: Fan positions
- **WHEN** the Fibonacci deck is chosen
- **THEN** the large fan shows the cards 0, 3, 8, 34 and 89 (the first, a quarter of the way, the middle, three quarters and the last of the scale)

#### Scenario: A phone
- **WHEN** the start page is shown on a 390 px phone
- **THEN** the tiles are one snapping row with the next tile peeking

### Requirement: No typed list on the start page or in the room
The start page and the room SHALL NOT offer a text field in which the cards of a deck are typed as a list separated by commas. A deck SHALL be made with the builder, and a list of text SHALL define cards only through the advanced import of the builder.

#### Scenario: Make your own
- **WHEN** the visitor opens the start page
- **THEN** there is no field labelled with commas, and a plus tile "Make your own" opens the builder

#### Scenario: A French half
- **WHEN** a person types 0,5 as the label of a card in the builder
- **THEN** the card is "0,5" refused as containing a comma, in words, and no second card is made

### Requirement: The builder makes a deck of cards
The builder SHALL show the deck as a strip of cards ending with a plus tile, a live preview of the selected card, and let the person add a card with the plus tile (which proposes the next value of a numeric run), edit its label in place on the preview, reorder cards, remove cards, choose a look and turn special cards on and off. It SHALL edit a copy: nothing changes until the person uses the deck. A deck SHALL have 2 to 24 cards of at most 6 characters.

#### Scenario: The plus tile proposes
- **WHEN** the deck ends with 13 and 21 and the person presses the plus tile
- **THEN** a card "34" is added, selected, with the cursor in its label

#### Scenario: Edit in place
- **WHEN** the person types "40" in the label of the selected card
- **THEN** the preview and the card in the strip show "40" as they type

#### Scenario: Nothing until use
- **WHEN** the person closes the builder with the close button
- **THEN** the deck of the start page is unchanged

#### Scenario: The limits
- **WHEN** the person tries to remove cards below two, or add above 24
- **THEN** the remove button says a deck needs 2 cards, and the plus tile says a deck holds 24

### Requirement: Cards can be moved without dragging
The builder SHALL let a person reorder cards by dragging with a pointer (a long press on touch), by keys (Alt with the arrow keys, Home and End) and by an Earlier and a Later button, and SHALL announce each move politely with the card and its new position. Removing a card SHALL offer an undo for 8 seconds.

#### Scenario: By keys
- **WHEN** the person selects the card 5 in a deck of 11 and presses Alt+ArrowLeft
- **THEN** the card moves one place earlier and a live region says "5 moved to position 3 of 11"

#### Scenario: By button
- **WHEN** a screen-reader user presses "Later" on a selected card
- **THEN** the card moves one place later with no dragging

#### Scenario: Undo a removal
- **WHEN** the person removes the card 13 and presses "Undo" within 8 seconds
- **THEN** the deck is as before the removal

### Requirement: Problems are said in words
Every problem of a deck SHALL be said in one sentence that names the card and says what to do, SHALL be shown on the card with an outline and an icon (not by colour alone), SHALL be announced once, and SHALL NOT remove the picture of the deck. Using a deck with a problem SHALL move the focus to the first problem.

#### Scenario: A duplicate
- **WHEN** two cards both say 5
- **THEN** the sentence "Two cards say 5. Each card needs its own name." is shown, both cards are outlined with an alert icon, and the strip is still drawn

#### Scenario: Too long
- **WHEN** a card says "extra-large"
- **THEN** the sentence names "extra-large", says it is 11 characters and a card holds 6, and offers no other control to fix it than the label

#### Scenario: Use with a problem
- **WHEN** the person presses "Use this deck" while a problem exists
- **THEN** the deck is not used, the focus moves to the first problem card and its sentence is announced

#### Scenario: Reserved word
- **WHEN** the person types "~split" as a label
- **THEN** the sentence says it is a special card to add from Special cards, and no card is made of it

#### Scenario: Every kind of problem
- **WHEN** a deck has fewer than 2 cards, more than 24, an empty label, a label of more than 6 characters, a duplicate, a comma or a control character, or a special word typed by hand
- **THEN** each has its own sentence that names the card or the count

### Requirement: A list can be imported as an advanced option
A menu item of the builder SHALL open an import dialog that accepts a list separated by newlines, tabs, semicolons or commas, shows the parsed cards and their problems before anything changes, and offers "Replace the deck" and "Add to the deck". A list of more than 24 cards SHALL be refused whole with the count, never cut.

#### Scenario: Newlines
- **WHEN** the person pastes three lines "1", "0,5" and "2"
- **THEN** the dialog shows three cards, the second being "0,5" with its comma problem

#### Scenario: A comma list on one line
- **WHEN** the person pastes "1, 2, 4, 8"
- **THEN** four cards are shown

#### Scenario: Too many
- **WHEN** the person pastes 30 lines
- **THEN** the dialog says "30 cards found. A deck holds 24." and neither button changes the deck

### Requirement: Looks and special cards are chosen visually
The builder SHALL offer the eight looks as radio tiles that each draw a mini card with the deck's own labels, and the four special cards as toggles shown as their own small cards with their words. The preview and the strip SHALL change at once, and the preview SHALL offer the face and the back of the card in the theme's skin.

#### Scenario: A look
- **WHEN** the person picks the Tee look
- **THEN** the strip and the preview draw each card as a shirt of its rank at once

#### Scenario: Special toggles
- **WHEN** the person presses the "Pass" toggle
- **THEN** it is pressed, the card appears after the scale in the strip, and pressing it again removes it

### Requirement: Decks are kept in the team space
A person SHALL be able to save a deck to the current team's decks, at most 12 per team, and to edit, duplicate, rename, make default and delete a saved deck. A saved deck SHALL appear in the gallery after the presets with the team's badge, and a team's default deck SHALL be chosen when the start page opens. Saved decks SHALL stay on the device, be sealed with the rest of the workspace and travel only with the encrypted vault.

#### Scenario: Save and reuse
- **WHEN** a person builds "Backend sizes", saves it to their team and opens the start page again
- **THEN** the deck is a tile after the presets with the team's badge, and choosing it creates a room with those cards

#### Scenario: Default deck
- **WHEN** the team's default deck is "Backend sizes"
- **THEN** the start page opens with it chosen and its fan in the hero

#### Scenario: Nothing in the clear
- **WHEN** a deck named with a canary string is saved with a connected sync target
- **THEN** the canary appears in no object of the target and in no relay frame

### Requirement: The deck travels with the room
The moderator's deck SHALL be written into the room before the first round, so that every participant sees the same cards in the same look and in their own theme's skin, and SHALL NOT be sent to a participant as a file or a link. A participant SHALL be able to read the deck's cards and the meaning of its special cards from the room, and save it to their own team's decks on their device alone.

#### Scenario: Same cards for everybody
- **WHEN** a moderator creates a room with a custom deck and a second person joins
- **THEN** both see the same cards in the same order and the same look

#### Scenario: Keep a room's deck
- **WHEN** a participant opens the deck sheet and presses "Save to my team's decks"
- **THEN** the deck is in their team's decks and no event is sent to the room

### Requirement: The deck can be switched between rounds
The moderator SHALL be able to switch the deck from the room's menu in the lobby and between rounds, with the same gallery. The new deck SHALL apply from the next round, a round in progress SHALL keep its deck, and when the open round has no card in it the moderator SHALL be able to start a new round with the new deck at once. A voter SHALL NOT be able to switch the deck.

#### Scenario: Between rounds
- **WHEN** the moderator switches from Fibonacci to T-shirt after a reveal and starts the next round
- **THEN** every participant's hand is the T-shirt deck in round 3 and round 2 still shows its Fibonacci cards

#### Scenario: Cards are in
- **WHEN** the moderator opens the switch while two cards are in the open round
- **THEN** the button says it applies from the next round, and the round's hand does not change

#### Scenario: No cards yet
- **WHEN** the moderator opens the switch in an open round with no card in it
- **THEN** the sheet offers to start a new round with the new deck, and doing so replaces the empty round for everybody

#### Scenario: A voter
- **WHEN** a voter opens the room's menu
- **THEN** "Deck" opens a read-only view with no switch

### Requirement: The hand shows scale and special cards together
A deck of up to 14 scale cards and up to 4 special cards SHALL wrap in centred rows with the special cards after the scale, set apart by a gap and a divider; a deck of 15 to 24 scale cards SHALL be one snapping row. At 390x664 the Fibonacci deck with its special cards SHALL fit in two rows and a deck with all four special cards in three, every card at least 44x44 px, without scrolling the page. The line under the hand SHALL name the chosen or focused special card.

#### Scenario: Fibonacci on a phone
- **WHEN** a voter opens a round of the Fibonacci deck on a 390x664 phone
- **THEN** the 13 cards wrap in two rows (7 and 6), the special cards are set apart at the end, every card is at least 44x44 px and the page does not scroll

#### Scenario: All four special cards
- **WHEN** the deck has 11 scale cards and four special cards at 360x640
- **THEN** the hand is three rows, the dock and the buttons are inside the viewport and the page does not scroll

#### Scenario: Caption of a special card
- **WHEN** a voter on a touch phone plays "Split it"
- **THEN** the line under the hand says "You played: Split it" and the card is lifted, ringed and checked

### Requirement: Deck words in French and English, within their boxes
Every string of the gallery, the builder, the special cards and the looks SHALL have an `fr` and an `en` key, French being the source. Nothing SHALL overflow sideways or be cut off at 360, 390, 768 and 1440 px in French, English and the pseudo-locale, with 24-character deck names and 24 cards.

#### Scenario: A long deck name
- **WHEN** a saved deck is named with 24 characters
- **THEN** its tile shows one line with an ellipsis and its accessible name is the full name

#### Scenario: Twenty-four cards on a phone
- **WHEN** the builder holds 24 cards at 360x640 in French
- **THEN** the strip wraps, the footer button is inside the viewport and no label is cut

### Requirement: The new code is lazy and small
The glyphs, the skins, the gallery, the builder, the import and their strings SHALL be loaded only with the poker pages, SHALL add at most 24 kB gzip in all to the total bundle, and SHALL add nothing to the entry chunk.

#### Scenario: Budget
- **WHEN** the bundle budget runs after the last task of this change
- **THEN** the entry chunk is unchanged and the total grew by 24 kB gzip or less

#### Scenario: Other pages
- **WHEN** the landing page or a board is opened
- **THEN** no code of the gallery, the builder or the glyphs is requested
