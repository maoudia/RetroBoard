## ADDED Requirements

### Requirement: A poker room keeps the product's design language
Every surface of a poker room except the cards and the deck tiles SHALL be made of the product's own components, classes, tokens and patterns: the toolbar, `Dropdown` menus, dialogs, `.btn` buttons, `ToggleSwitch`, `.chip` and `.seg` choices and the share panel. No poker component SHALL define its own bar, menu, dialog, button, chip, panel or notice, or contain a hard-coded colour, a literal font size or an off-scale radius.

#### Scenario: A guard
- **WHEN** the design guard tests scan the poker pages and components
- **THEN** they find no local rule for a button, chip, panel, notice or toolbar that the shared stylesheet or a shared component already provides

#### Scenario: Same menus
- **WHEN** a person opens the room's overflow menu and a board's
- **THEN** both are the same `Dropdown` with the same language and light-or-dark items, in the same order, and a bottom sheet on a phone

### Requirement: One session underneath
A poker room SHALL run on the board session: the shared transport (peer-to-peer links with the relay as fallback), the local replica and the live presence, with a send that takes any event body. A reload, a closed tab, offline use and a relay restart SHALL keep the room's history and the person's own card, and the relay SHALL remain unable to tell a room's kind.

#### Scenario: Reload
- **WHEN** a participant reloads the room page in the middle of a round after playing a card
- **THEN** the room reopens from the local copy, the seat and the own card are kept, and no card is shown to anyone before the reveal

#### Scenario: Relay restart
- **WHEN** the relay forgets the room while two people are in it
- **THEN** their replicas re-seed it and the round continues

#### Scenario: Frames
- **WHEN** a scripted room runs before and after the move to the shared transport
- **THEN** every frame still has the five fields, no frame contains a word of the room's vocabulary, and the count of frames for the same actions is not larger than before plus the presence frames of a board

### Requirement: The own card is sealed at rest
A voter's signing seed and own card SHALL be kept on the device sealed with the device key, and SHALL NOT be kept in clear in the tab's storage.

#### Scenario: Storage
- **WHEN** a voter has played a card and the page's storage is read
- **THEN** no entry contains the card, the round, or the seed in clear

### Requirement: Poker rooms are library entries
A poker room SHALL be an entry of the person's library with a kind, the team, the role (facilitator or moderator), the last activity and the same actions as a board (open, archive, forget). The library SHALL offer a filter between all entries, retros and estimations. The kind SHALL be an optional field, absent for a board, and an older reader SHALL list the entry as a board that opens the same link.

#### Scenario: Listed
- **WHEN** a person creates a room, closes the tab and opens the library
- **THEN** the room is listed with the estimation icon and label, its team and its role, and opening it reopens the room with its keys

#### Scenario: Filter
- **WHEN** the person chooses "Estimations"
- **THEN** only rooms are listed

#### Scenario: Synced
- **WHEN** a sync target is connected and a room is created
- **THEN** the entry reaches the target sealed, the title of a story appears in no object of the target in clear, and a second device lists the room

#### Scenario: An older reader
- **WHEN** a client that does not know the kind field reads the library
- **THEN** the entry is listed as a board, and opening it lands in the poker room through the existing hand-off of a poker link

### Requirement: One share panel and every join path
The share panel of a poker room SHALL be the board's share dialog with the room's wording: the participant link (never the moderator secret), the QR code, the invite templates by chat and e-mail, the passcode to copy, the short code with the approval prompt, the moderator link card and the confirmation words. A person SHALL be able to join with the landing page's field (a pasted link or a short code) and with the QR scanner.

#### Scenario: Share
- **WHEN** the moderator opens the share dialog of a room
- **THEN** it shows the same sections as a board's with the room's words, copies the participant link without the moderator secret, and shows the passcode only to be copied

#### Scenario: Join by code
- **WHEN** a person types the short code on the landing page and the moderator approves
- **THEN** the person opens the room, and the relay only saw the code, the room id and ciphertext

#### Scenario: Scan
- **WHEN** a person scans the QR code of a room
- **THEN** the room opens, asking for a name only if this device has none

### Requirement: A passcode and moderation, as for a board
A poker room SHALL propose a generated passcode by default, SHALL require an informed confirmation to create one without, SHALL ask for it when a person opens the link without it, and SHALL remember it with the local copy. "Everyone moderates" SHALL be an advanced switch, off by default for a room, that sets the board's open-facilitation setting; the round key SHALL stay with whoever opens a round.

#### Scenario: By default
- **WHEN** a moderator creates a room and leaves the form as proposed
- **THEN** the room has a generated passcode, and a person who opens the link without it is asked for it and can retry

#### Scenario: Without
- **WHEN** the moderator clears the passcode
- **THEN** a confirmation states the risks, and the room is created only if the moderator confirms

#### Scenario: Everyone moderates
- **WHEN** the switch is on and a participant opens a round
- **THEN** only that participant's device can reveal it, and a participant who did not open it cannot

### Requirement: Seats are people
A seat SHALL show the person's name and avatar hue from the identity store, SHALL show their presence (here, away or reconnecting), SHALL keep the crown for the moderator, and SHALL tell two people with the same name apart. A person whose device has a name SHALL enter without a name step, and a person without one SHALL be asked once. Rename, hide and remove SHALL be available from the participants menu with the board's wording and effects.

#### Scenario: Known name
- **WHEN** a person who has a name for boards opens a room link
- **THEN** they enter directly and their seat shows that name and their chosen hue

#### Scenario: Presence
- **WHEN** a participant closes their tab
- **THEN** their seat shows that they are away, keeps their voted mark, and is not removed

#### Scenario: Two Anns
- **WHEN** two participants are both called Ann
- **THEN** their seats carry a small rank that tells them apart, as on a board

#### Scenario: Remove
- **WHEN** the moderator removes a participant
- **THEN** the participant's events are ignored by every replica and their client leaves the room

### Requirement: The room has the product's tools
A poker room SHALL offer the shared chat, the shared timer (as the countdown before a reveal and as a break), talk time (the highest and lowest voters of a revealed round can be asked to explain), the presentation announcement, the activity feed, the shortcuts and help dialog, the attention and notification settings, the reveal sound and density and zoom, each as the board's own component with the board's settings and privileges. The coffee card SHALL NOT come back: a break is a timer.

#### Scenario: A break
- **WHEN** the moderator starts a five-minute break from the timer
- **THEN** every participant sees the countdown, and no card is involved

#### Scenario: Please explain
- **WHEN** a round is revealed and the moderator asks the highest voter to explain
- **THEN** the speaking turn starts with the budget of the room's talk-time setting and every participant sees it

#### Scenario: Away
- **WHEN** a participant is in another tab and a round opens
- **THEN** if they enabled it, the tab shows the attention dot and, with permission, a local notification, and nothing is pushed by a server

#### Scenario: Shortcuts
- **WHEN** the moderator presses R in a round with a card in
- **THEN** the round is revealed, and the help dialog lists R, N and V beside the board's shared shortcuts

### Requirement: The results use the shared charts
The distribution and the consensus of a revealed round SHALL be drawn with the shared bar chart and gauge components, with the same text alternatives, and the round history of a session SHALL be a panel in the product's list pattern.

#### Scenario: Distribution
- **WHEN** six voters play 8, 5, 5, 13, 5 and ?
- **THEN** the distribution is a list of rows through the shared bar chart with the card, its count as text and a bar, and no number is told by colour alone

### Requirement: Stories can come from a board
The moderator SHALL be able to add stories to a room from a board of the person's library, choosing from its open actions and its notes by column, with a preview before anything is added. The board's local copy SHALL be read on this device only, nothing SHALL be sent to the board, and the stories SHALL be added in batch events within the relay's budgets.

#### Scenario: From a retro
- **WHEN** the moderator picks three open actions of a library board and confirms the preview
- **THEN** three stories are added to the room, paced within the frame budget, and the board receives nothing

#### Scenario: A board with no local copy
- **WHEN** the board's local copy is not on this device
- **THEN** the picker says so and offers to open the board first

### Requirement: Estimating from a board and back
The menu of an action and of a note on a board SHALL offer "Estimate", which starts the estimation phase of that board for the item, and "Estimate in a room instead", which creates a room seeded with the item. A room started from a board SHALL be able to send its decided estimates to the board's estimates and SHALL show "Back to the retro" in its menu. A board that cannot accept them SHALL say so and offer the export.

#### Scenario: In a room instead
- **WHEN** a facilitator chooses "Estimate in a room instead" on an action
- **THEN** a room opens with that action as its story and a link back to the board

#### Scenario: Send back
- **WHEN** the moderator of such a room presses "Send estimates to the retro" and the board accepts
- **THEN** the board shows the estimates on those items

#### Scenario: Not accepted
- **WHEN** the board is closed or the person lacks the right to write the estimates
- **THEN** the room says so and offers the export of the estimates

### Requirement: Language and pseudo-locale through the shared loader
Every string of a poker room SHALL have an `fr` and an `en` key, French being the source, SHALL load lazily with the poker pages through the product's shared translate and pseudo-locale functions, and SHALL be lengthened by `?lang=pseudo` like every other page.

#### Scenario: Pseudo
- **WHEN** a room is opened with `?lang=pseudo`
- **THEN** its strings are lengthened and nothing overflows at 360, 390, 768 and 1440 px

### Requirement: Nothing is tracked
A poker room SHALL NOT use analytics, trackers, cookies, remote fonts, remote images or a third-party origin, and no shared piece reused by a poker room SHALL add one.

#### Scenario: Network
- **WHEN** a room is played end to end with the network observed
- **THEN** the only requests are to the site's own origin and its relay, and the CSP reports no violation

### Requirement: The entry chunk does not grow
The poker integration SHALL add nothing to the entry chunk that it does not remove from it, and at most 20 kB gzip to the total bundle, loading its room tools and exporters lazily with the poker pages. A task that must grow the entry SHALL name the budget line it needs.

#### Scenario: Budget
- **WHEN** the bundle budget runs after the last task of this change
- **THEN** the entry chunk is no larger than before and the total grew by 20 kB gzip or less

#### Scenario: Other pages
- **WHEN** a board or the landing page is opened
- **THEN** no code of the room's tools or exporters is requested
