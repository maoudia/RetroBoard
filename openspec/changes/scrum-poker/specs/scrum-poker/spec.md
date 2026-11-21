## ADDED Requirements

### Requirement: One-click private room
A person SHALL be able to start a poker room with a name and a deck and no account, and share it by link, QR code or short code. The room SHALL use end-to-end encryption with the key in the link fragment, SHALL store nothing on the service, and SHALL let others join with a name only.

#### Scenario: Start and join
- **WHEN** a person starts a room and a colleague opens the shared link
- **THEN** the colleague joins by giving a name and sees the same table, with no account on either side

#### Scenario: What the service sees
- **WHEN** a round is played
- **THEN** the relay carries only ciphertext, sizes and timing and keeps nothing after the last participant leaves

### Requirement: Sealed cards revealed together
A voter's card SHALL stay hidden from every other participant, including a modified client, until the moderator reveals the round, and the reveal SHALL show every card to everyone at once. The table SHALL show who has voted without showing the value. The moderator's own device holds the key of the round and is trusted not to read cards early; the interface SHALL never show a card before the reveal and the help SHALL say who is trusted.

#### Scenario: Before the reveal
- **WHEN** three of four voters have chosen a card
- **THEN** the table shows three face-down cards and one waiting seat, and no value is visible to anyone, and no voter's client can open another voter's card

#### Scenario: Reload mid-round
- **WHEN** a voter reloads the page after choosing a card
- **THEN** their own card is still selected for them and nobody else can see it

#### Scenario: After the reveal
- **WHEN** a round is revealed
- **THEN** a vote can no longer be changed and a re-vote starts a new round of the same story

### Requirement: Results for the discussion
After a reveal the room SHALL show the average, median, mode and spread of the numeric cards, a consensus meter with its text, the lowest and highest cards highlighted with a timer for their explanation, and a suggested estimate that is the card nearest to the median and is never applied by itself. Cards that are not numeric SHALL be counted and excluded from numeric statistics.

#### Scenario: Divergent votes
- **WHEN** the cards are 2, 3, 3 and 13
- **THEN** the median is 3, the 13 is highlighted as the highest card and the suggestion is 3

#### Scenario: Question mark
- **WHEN** one voter plays "?"
- **THEN** it is shown and counted as a non-numeric card and the statistics use the other cards

#### Scenario: Not by colour alone
- **WHEN** the consensus meter is shown
- **THEN** its value is also given in words

### Requirement: Stories and decisions
A moderator SHALL manage a list of stories (typed or pasted one per line), select the current story, record the final estimate, and move to the next story. Earlier rounds of a story SHALL stay visible in its history. A session summary SHALL list stories, estimates, the total and the rounds each took.

#### Scenario: Paste a list
- **WHEN** a moderator pastes ten lines
- **THEN** ten stories are added in order

#### Scenario: Decide
- **WHEN** the moderator decides 5 for the current story
- **THEN** every participant sees the story as estimated at 5 and the next story can be selected

### Requirement: Decks
The room SHALL offer Fibonacci, modified Fibonacci, T-shirt sizes, powers of two, hours and days, each with a "?" card (the two Fibonacci decks also have a coffee card), and SHALL let the moderator define a custom deck typed as a comma separated list of 2 to 24 different cards of at most 6 characters, shown as round chips on the start page. A team's default deck SHALL be kept in the local team space.

#### Scenario: Custom deck
- **WHEN** a moderator enters the cards "1, 2, 4, 8, ?"
- **THEN** the hand shows exactly those cards in that order

#### Scenario: Invalid deck
- **WHEN** a custom deck has no card or a duplicate card
- **THEN** it is refused with a message and the previous deck stays

### Requirement: Roles and limits
The creator SHALL moderate by default and MAY transfer the role or let everyone moderate. Observers SHALL watch without a card. A room SHALL cap its voters at 20 (the figure of ADR-0042, chosen inside the 30 connections of a room so that the relay fallback stays inside its budgets), and every replica SHALL apply the cap the same way.

#### Scenario: A voter cannot reveal
- **WHEN** a voter tries to reveal or decide while one moderator is set
- **THEN** the action is refused

#### Scenario: Room full
- **WHEN** a voter joins a room that already has 20 voters
- **THEN** they are offered to join as an observer, and a card they send anyway is ignored by every participant

#### Scenario: Moderator changes in the middle of a round
- **WHEN** the moderator role is transferred while cards are sealed and not yet revealed
- **THEN** the round starts again with the new moderator and the voters choose again

### Requirement: Accessible and themed table
The hand SHALL be operable by keyboard (a radio group, and the keys typed name a card: 5 picks the card 5, 1 then 3 picks 13, x then l picks XL), the table and results SHALL meet WCAG 2.2 AA, motion SHALL respect reduced-motion settings, and the cards and table SHALL use the retro themes.

#### Scenario: Keyboard only
- **WHEN** a person plays a round using only the keyboard
- **THEN** they can pick a card, see the reveal announced and read the results

### Requirement: Rooms in the library and exports
A paused or finished room SHALL appear in the local library and sync with the encrypted vault like a board, and its summary SHALL be exportable as text, CSV and JSON through the export doors, with story titles never readable in any synced or exported file the person did not choose to make readable.

#### Scenario: Reopen
- **WHEN** a person opens a finished room from the library
- **THEN** they see its stories, estimates and rounds

#### Scenario: CSV
- **WHEN** a person exports the summary as CSV
- **THEN** each story is a row with its key, title and final estimate in a layout a Jira CSV import accepts
