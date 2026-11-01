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
