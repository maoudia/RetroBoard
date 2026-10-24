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

### Requirement: Board expiry
The system SHALL erase a board 24 hours after its last activity.

#### Scenario: Inactive board
- **WHEN** nobody acted on a board for 24 hours
- **THEN** opening the link shows a new empty board

### Requirement: Solo mode
The system SHALL offer a solo mode that runs entirely in the browser without contacting the relay.

#### Scenario: Try solo
- **WHEN** a visitor chooses "Try it solo"
- **THEN** a local board opens and no WebSocket connection is made
