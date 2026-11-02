# board-session Specification

## Purpose
How a board is created, joined and kept alive: the link is the invitation, participants appear in a presence list and a board disappears after inactivity.

## Requirements

### Requirement: Board creation from setup
The system SHALL let anyone create a board without an account by choosing a title, a theme and a retro format, and SHALL open the new board immediately.

#### Scenario: Create a board
- **WHEN** a visitor submits the setup form on /new
- **THEN** a board with the chosen title, theme and columns opens at a unique link

### Requirement: Join by link
The system SHALL let anyone who has the board link join it, and SHALL ask for an optional display name on first join.

#### Scenario: Join with a name
- **WHEN** a person opens a board link for the first time
- **THEN** a name dialog is shown and the person can enter a name or stay anonymous

#### Scenario: Invalid link
- **WHEN** the room id in the link is malformed
- **THEN** an explanation is shown instead of the board

### Requirement: Presence list
The system SHALL show the number and names (or "Anonymous") of the people currently connected.

#### Scenario: Second participant joins
- **WHEN** a second person joins the board
- **THEN** both participants see a count of 2 in the participants menu

### Requirement: Solo mode
The system SHALL offer a solo mode that runs entirely in the browser without contacting the relay.

#### Scenario: Try solo
- **WHEN** a visitor chooses "Try it solo"
- **THEN** a local board opens and no WebSocket connection is made

### Requirement: Board lifetime
The system SHALL keep a board only in participants' replicas and exported board files; a board SHALL disappear from the service as soon as no participant is connected and the relay is evicted, and SHALL disappear from a device when its local retention period ends.

#### Scenario: Everyone left
- **WHEN** all participants closed the board and the relay was evicted
- **THEN** the service holds no trace of the board and only participants' replicas or board files can bring it back

### Requirement: Toolbar slides horizontally on small screens
On narrow screens the toolbar tools SHALL stay on a single row that scrolls horizontally instead of wrapping, so that the columns keep their space.

#### Scenario: Phone
- **WHEN** a participant opens a board at 360 px wide
- **THEN** the toolbar is at most two rows high, the tools row scrolls sideways, and a focused tool is scrolled into view

#### Scenario: Menus
- **WHEN** the participant opens a toolbar menu while the row is scrolled
- **THEN** the menu opens next to its button, not clipped by the row

### Requirement: Simple creation
In simple mode the creation page SHALL show only the title, the retro format and the create button, apply the recommended defaults, and keep every other option available under Advanced.

#### Scenario: Quick start
- **WHEN** a visitor in simple mode picks a format and creates the board
- **THEN** the board opens with the one-hour agenda, everyone facilitating, arrival popups on and the format's voting defaults

#### Scenario: Personalise
- **WHEN** a visitor switches the creation page to Advanced
- **THEN** theme, facilitation, arrival popups, voting columns, passcode, agenda and carry-over actions are shown

### Requirement: Home page resumes work
The home page SHALL show the recent boards as a prominent card above the presentation when the browser has some, with the title, the theme and when it was last opened.

#### Scenario: Returning visitor
- **WHEN** a visitor with two recent boards opens the home page
- **THEN** both boards are listed with their last opened time before the marketing sections

### Requirement: Connection state of participants
The board SHALL show for every connected participant whether they are linked directly, through the relay only or reconnecting, in colour and in words, and SHALL list who left.

#### Scenario: Relay only
- **WHEN** Bob's browser cannot open a direct link and uses the relay
- **THEN** everyone sees an amber dot next to Bob described as "through the relay"

### Requirement: Arrivals and departures
Joins and departures SHALL appear in the activity feed; a board option chosen at creation SHALL decide whether they also appear as short popups.

#### Scenario: Popups off
- **WHEN** the facilitator created the board with arrival popups off and Carol joins
- **THEN** no popup appears and the activity feed says Carol joined

### Requirement: Board options follow the interface mode
The board options dialog SHALL show the essentials in simple mode and every setting in advanced mode, without removing any setting.

#### Scenario: Simple options
- **WHEN** Alice opens the options in simple mode
- **THEN** she sees votes per person and secret voting, and not the talk time budget
- **AND WHEN** she switches to advanced
- **THEN** the talk time budget appears

### Requirement: The local copy survives use
The local encrypted copy of a board SHALL be kept for the chosen retention counted from the last time the board was opened or written, and the start-up cleanup SHALL NOT delete a board that this tab is opening.

#### Scenario: Reopened every day
- **WHEN** Alice opens a board every day and never writes in it, with a retention of 7 days
- **THEN** the board is still on her device after 30 days

### Requirement: The waiting screen asks again
While no connected participant holds the board, the page SHALL offer a "Try again" action and SHALL reconnect by itself at a regular interval.

#### Scenario: A holder arrives
- **WHEN** Bob opens the board while Alice sees the waiting screen
- **THEN** the board appears for Alice without any action, at the latest at the next retry

### Requirement: Primary creation action on the right
The "Create board" button SHALL sit at the right end of the creation form on every layout.

#### Scenario: Desktop
- **WHEN** Alice opens the creation page
- **THEN** the Create board button is in the right half of the form

### Requirement: Join a board from the landing page
The landing page SHALL let a visitor paste a board link and open that board, and SHALL say when the pasted text is not a board link.

#### Scenario: Paste a link
- **WHEN** Bob pastes the link Alice sent him on the landing page and presses Join
- **THEN** the board opens for Bob

#### Scenario: Wrong text
- **WHEN** Bob pastes "hello"
- **THEN** an error says it is not a RetroBoard link and nothing opens

### Requirement: Next retro title suggestion
The creation form SHALL prefill the title with the previous board's title incremented by one when that title ends with a small number, and SHALL keep the dated default otherwise.

#### Scenario: Sprint increment
- **WHEN** Alice opened "Sprint 42" earlier and opens the creation page
- **THEN** the title field shows "Sprint 43"

### Requirement: Voting choices at creation
Advanced creation SHALL let the facilitator choose the votes per person and the sealed ballot, and the new board SHALL start with those settings.

#### Scenario: Five votes, sealed
- **WHEN** Alice creates a board in advanced mode with 5 votes per person and the sealed ballot
- **THEN** the options of the new board show 5 votes per person and the sealed ballot on
