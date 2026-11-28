## ADDED Requirements

### Requirement: Tickets can be put on a board as notes
A facilitator SHALL be able to import tickets onto a board from the sources of `jira-estimation-import` (a pasted Jira list, a Jira CSV file, a list of keys), or to type or paste them as notes. An import SHALL show a preview with row errors first, SHALL publish the tickets as notes in a column named "Tickets" in batches of at most 30, SHALL be idempotent by Jira key, SHALL stop at the board's 300 notes, and SHALL use no token and make no network call to Jira.

#### Scenario: Paste from Jira
- **WHEN** a facilitator pastes a Jira backlog list of 45 issues and confirms the preview
- **THEN** 45 notes "KEY Title" appear in the Tickets column, published in two batches, and the page shows no network request to Jira

#### Scenario: Twice
- **WHEN** the same list is imported again with one title changed
- **THEN** no note is duplicated and the changed ticket's text is updated

#### Scenario: Too many
- **WHEN** the import would take the board over 300 notes
- **THEN** it says how many fit, imports none beyond the limit and keeps the board valid

#### Scenario: Backlog refinement format
- **WHEN** a person creates a board from the "Backlog refinement" format
- **THEN** it has one column "Tickets" and an agenda of Write, Estimate and Close

#### Scenario: Imported text is content
- **WHEN** a ticket title contains instructions or markup
- **THEN** it is shown as text, never logged and never used as an instruction

#### Scenario: An existing estimate
- **WHEN** a Jira row carries an estimate
- **THEN** it is kept as an imported estimate of that ticket once the estimation has started

### Requirement: The facilitator starts the estimation
A facilitator SHALL start the estimation from a dialog that lists the board's columns with their note counts, preselects the column the import created (else the columns where most notes carry a Jira key, else the first), offers the deck gallery of `poker-deck-studio` and the options "Include open actions" and "Include notes that already have an estimate" (both off). Drafts, notes inside a cluster and notes of hidden columns SHALL NOT enter the queue.

#### Scenario: Default selection
- **WHEN** a board has 12 notes with Jira keys in "Tickets" and 5 notes without keys in "Ideas"
- **THEN** the dialog preselects "Tickets (12)" and not "Ideas (5)"

#### Scenario: Excluded notes
- **WHEN** the queue is made from a column that holds a draft, a clustered note and a published note
- **THEN** only the published, unclustered note enters

#### Scenario: Already estimated
- **WHEN** two of 12 tickets already have an estimate and the option is off
- **THEN** 10 tickets enter the queue

#### Scenario: Who runs it
- **WHEN** the dialog is opened
- **THEN** it says that only facilitators run the estimation and everyone votes

### Requirement: The queue is in the column's order and the facilitator keeps it
The queue SHALL follow the order the columns show (pinned notes first, then by creation), the columns in the order chosen, frozen to note ids at the start. The current ticket SHALL be the first not decided, parked or split. A facilitator SHALL be able to skip, pick, reorder (by dragging, by keys and by buttons), add, park, split and put back tickets, and a note deleted from the board SHALL leave the queue.

#### Scenario: Order
- **WHEN** the column shows PROJ-101 (pinned), PROJ-103 and PROJ-102 in that order
- **THEN** the queue is PROJ-101, PROJ-103, PROJ-102 and PROJ-101 is current

#### Scenario: Skip
- **WHEN** the facilitator skips the current ticket
- **THEN** it moves to the end and the next ticket is current

#### Scenario: Reorder without dragging
- **WHEN** a keyboard user selects a ticket and presses Alt+ArrowUp
- **THEN** it moves one place earlier and a live region says its new position

#### Scenario: Add
- **WHEN** a new ticket note is added to the Tickets column during the phase and the facilitator adds it
- **THEN** it joins the end of the queue

#### Scenario: Deleted
- **WHEN** a facilitator deletes a queued note
- **THEN** it leaves the queue and its estimate is not exported

### Requirement: Each ticket gets a sealed round and a reveal
Each ticket SHALL be estimated in a round with the behaviour of a poker room's round: cards sealed to a key per round derived on the opening device and hidden from every participant until the reveal, a reveal that makes every replica open every card itself, one card per voter changeable until then, a cap of 20 voters with later seats watching, and the statistics, special cards and suggestion of `scrum-poker`.

#### Scenario: Hidden until the reveal
- **WHEN** three of four voters have played on a ticket
- **THEN** no element of the page and no replica shows any card value, and the seats show who has voted

#### Scenario: Reveal
- **WHEN** the opening facilitator reveals
- **THEN** every participant sees the cards at once and the same statistics

#### Scenario: Twenty-first voter
- **WHEN** a 21st person opens the phase view
- **THEN** they watch with no hand

#### Scenario: Reuse
- **WHEN** the rounds of a board's estimation and of a poker room are compared for the same cards
- **THEN** they produce the same statistics, the same verdict and the same suggestion

#### Scenario: Joining mid-round
- **WHEN** a voter opens the phase view while a round is open
- **THEN** they can play in that round

### Requirement: The agreed estimate is a badge on the ticket and kept in the board
Deciding a card for a ticket SHALL store it by the note's id in the board's estimation state, take the ticket out of the queue, make the next ticket current, and show the estimate as a badge on the note (see the notes requirement). A later decision on the same ticket after a re-vote SHALL replace it. The estimate SHALL travel with the board (replica, sync, library) and SHALL be in the board's exports.

#### Scenario: The end-to-end path
- **WHEN** tickets are imported, the facilitator starts the estimation, the room plays one ticket and the facilitator decides 5
- **THEN** the note shows the badge 5 for everyone, the next ticket is current, and the estimate is in the Jira CSV

#### Scenario: Re-vote
- **WHEN** a ticket is voted again and decided with a different card
- **THEN** the badge shows the new card and the old one is gone

#### Scenario: Reload
- **WHEN** a participant reloads the page after the decision
- **THEN** the badge is still on the note

### Requirement: Same board, same people
Everyone on the board SHALL be in the estimation with no second link, key or passcode: the events SHALL be encrypted with the board's room key and passcode, the presence, chat, timer and theme SHALL be the board's, and the phase view SHALL be shown to every board page when the phase starts, with a control to look at the board without leaving it. A person's seat SHALL be made when their page first shows the phase view, with the name and hue of the board's identity.

#### Scenario: No hop
- **WHEN** the facilitator starts the estimation
- **THEN** every participant's page shows the phase view on the same URL, and no new link, code or passcode was needed

#### Scenario: Look at the board
- **WHEN** a participant switches to "Board" during a round
- **THEN** they see the board and can switch back to the round, and their seat and card are unchanged

#### Scenario: The relay
- **WHEN** a round is played with the network observed
- **THEN** every relay frame has the five fields and contains no word of the estimation

### Requirement: Only facilitators run the estimation
The lead facilitator and the co-facilitators SHALL start and end the phase, set the queue, start rounds, reveal from the device that opened the round, decide, flag, requeue and clear estimates, even on a board that lets everyone facilitate. Everyone SHALL be able to play a card, chat and see the timer. A change of the lead in the middle of a round SHALL start a new round for the same ticket.

#### Scenario: A participant
- **WHEN** a participant of an open board sends a reveal, a decision or a queue change
- **THEN** every replica ignores it

#### Scenario: Delegation
- **WHEN** the lead delegates a participant as a co-facilitator
- **THEN** that person can start rounds and decide

#### Scenario: Handover
- **WHEN** the lead hands over to another facilitator in the middle of a round
- **THEN** a new round for the same ticket opens and the earlier open round is dropped

### Requirement: Late joiners and reloads see the phase as it is
A person who opens the board during the phase, or reloads the page, SHALL see the queue with each ticket's state, the badges, the current ticket and, if a round is open, the table with who has voted and no card values. The voter's own card SHALL be kept on the device sealed and SHALL be sent again if the relay forgot the round.

#### Scenario: Late joiner
- **WHEN** a person opens the board link while the third of twelve tickets is in a round
- **THEN** they see three estimates as badges, the third ticket current, the voted marks, and a hand they can play

#### Scenario: Relay restart
- **WHEN** the relay forgets the room mid-round and the replicas re-seed it
- **THEN** every voter's card is still in the round and the round continues

### Requirement: Tickets without consensus have a way out
After a reveal with some or no agreement, "Vote again" SHALL be the filled action and the decision menu SHALL offer "Use the suggested card anyway", "Park" and "Split". A parked ticket SHALL leave the queue with a "Parked" badge and be able to come back; a split ticket SHALL leave it with a "To split" badge. Special-card majorities SHALL point to the same exits.

#### Scenario: Disagreement
- **WHEN** the verdict is "No agreement yet"
- **THEN** Vote again is filled, and the menu has Use the suggested card, Park and Split

#### Scenario: Park
- **WHEN** the facilitator parks the ticket
- **THEN** it leaves the queue, its note shows "Parked", and the next ticket is current

#### Scenario: Split majority
- **WHEN** four of six voters play Split it
- **THEN** Split is the filled action and nothing creates new tickets by itself

#### Scenario: Known majority
- **WHEN** four of six voters play Already known
- **THEN** "Close without an estimate" is offered

#### Scenario: Information majority
- **WHEN** four of six voters play Need more information
- **THEN** Vote again is the filled action

### Requirement: The phase view is made of the board's own components on every screen
The phase view SHALL be a composition of the board's own toolbar, stepper, note card, segmented control, dialogs, menus, buttons and charts and of the standalone poker's table, hand and results, and SHALL define no bar, menu, dialog, button, chip or panel of its own. It SHALL fit a 390x664 phone without the page scrolling for up to 8 voters and, on a laptop, show the queue, the ticket with the table and the results side by side.

#### Scenario: Phone
- **WHEN** the phase view is open on a 390x664 phone with 8 voters in every state
- **THEN** the document does not scroll, the current ticket, the seats and the dock are inside the viewport and every target is at least 44 px

#### Scenario: Laptop
- **WHEN** the phase view is open at 1280x800
- **THEN** the queue is at the left, the ticket and the table in the middle, the results at the right and the hand under them, with no page scroll

#### Scenario: Components
- **WHEN** the design guard tests scan `components/estimation/`
- **THEN** they find no local rule for a button, chip, panel, menu or dialog that the shared stylesheet or a shared component provides, and no hard-coded colour or off-scale size

#### Scenario: TV
- **WHEN** the phase view is shown at 2560x1440 to a person who only watches
- **THEN** its content is scaled by the type scale, a card is 1.5 times the size of the same card on a laptop, and there is no dock

### Requirement: A result summary
The phase view SHALL show, at any time and at the end, the tickets estimated of the queue, the parked and the split, the total of the numeric estimates, the rounds taken and the longest to agree, in the product's list pattern, with a button that opens the export dialog with "Estimates only" on.

#### Scenario: End of the phase
- **WHEN** the phase ends with 9 tickets estimated, 2 parked and 1 split
- **THEN** the summary says so, shows the total of the numeric estimates, and its Export button opens the dialog with "Estimates only" on

### Requirement: Budgets
An estimation of 20 tickets by 20 voters SHALL send about 830 events at most, no frame SHALL exceed the relay's limits, the queue SHALL hold at most 100 tickets and a board at most 200 rounds, nothing SHALL be stored on the server, and the estimation's code SHALL be lazy and add at most 16 kB gzip to the total bundle and nothing to the entry chunk beyond a budget line the first task names.

#### Scenario: Frames
- **WHEN** a scripted estimation of 20 tickets with 20 voters is played
- **THEN** the number of events is within 10% of the figure of the design, no frame has more than the five fields and the relay refuses none

#### Scenario: Limits
- **WHEN** a facilitator tries to queue 101 tickets or start a 201st round
- **THEN** it is refused with a message and the board stays valid

#### Scenario: Other pages
- **WHEN** a board that never estimates is opened
- **THEN** no code of the phase view, the starter or the queue is requested
