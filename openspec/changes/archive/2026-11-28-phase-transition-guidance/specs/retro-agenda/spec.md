## ADDED Requirements

### Requirement: An empty Previous actions phase guides the team
When the running phase is Previous actions and the board has no carried-over action that is still open, the system SHALL show every participant a non-blocking card saying there is nothing to review, and SHALL offer the people who may steer one primary action that moves the agenda to the next phase. The system MUST NOT advance the phase by itself.

#### Scenario: Nothing to review
- **WHEN** the agenda enters Previous actions on a board with no carried-over action
- **THEN** every participant sees "Nothing to review from the last retro" and the facilitator sees the primary button "Start writing"

#### Scenario: One click to the next phase
- **WHEN** the facilitator presses "Start writing"
- **THEN** the agenda moves to the next phase for everyone and the card disappears

#### Scenario: A second, lighter suggestion
- **WHEN** six seconds pass without a response and the phase is still Previous actions
- **THEN** a toast with the same "Start writing" action appears once

#### Scenario: Never automatic
- **WHEN** the card and the toast are left alone until the phase timer ends on an agenda that is not chained
- **THEN** the phase is still Previous actions

#### Scenario: Participants without steering rights
- **WHEN** a participant who may not steer sees the card
- **THEN** it names the waiting for the facilitator, has no advance button, and the board stays readable

#### Scenario: Everyone facilitates
- **WHEN** the board uses open facilitation
- **THEN** every participant gets the "Start writing" button

#### Scenario: Dismissed
- **WHEN** a participant closes the card with Escape
- **THEN** neither the card nor the toast comes back in that tab for the rest of that phase

#### Scenario: Time given back
- **WHEN** more than one minute of the phase is left and the card is shown
- **THEN** it says how many minutes are kept by moving on

### Requirement: All previous actions done is a one-line moment
When carried-over actions exist and none is open, the system SHALL show a one-line confirmation with the same primary action instead of the list of finished actions.

#### Scenario: Everything closed
- **WHEN** the agenda enters Previous actions and all three carried-over actions are done or dropped
- **THEN** the participants see "All previous actions are done" and the facilitator sees "Start writing"

#### Scenario: Something still open
- **WHEN** at least one carried-over action is open
- **THEN** the review dialog lists the actions with their status buttons as before and no empty card is shown

### Requirement: Writing areas are hidden when going back
When the agenda returns to a phase that comes before the first Write phase and the board already holds published ideas, phase rules are running and the board option is on, the system SHALL collapse the writing areas of every column and SHALL show one banner with the reason and a "Show writing areas" button.

#### Scenario: Back from Write to Previous actions
- **WHEN** the facilitator moves from Write back to Previous actions on a board with six ideas
- **THEN** the writing areas of all columns are collapsed and the banner reads "Writing is closed in Previous actions"

#### Scenario: First pass of a new retro
- **WHEN** the agenda runs Previous actions for the first time on a board with no idea
- **THEN** the writing areas stay visible, greyed with their reason, as before

#### Scenario: Show anyway
- **WHEN** a participant presses "Show writing areas"
- **THEN** the writing areas of that participant are shown again, still closed by the phase rules, until the phase changes

#### Scenario: Drafts are safe
- **WHEN** the areas collapse while a participant has two drafts
- **THEN** the drafts return with the areas and none is lost

#### Scenario: Later phases are unchanged
- **WHEN** the current phase comes after Write
- **THEN** the greyed composer with its reason is shown as before

#### Scenario: Accessible
- **WHEN** the areas collapse while focus is inside a composer
- **THEN** focus moves to the banner button, the hidden areas leave the tab order, and a polite announcement says writing areas are hidden

#### Scenario: Reduced motion
- **WHEN** the person prefers reduced motion
- **THEN** the areas collapse and expand without animation

### Requirement: The board option for hidden writing areas
The board SHALL have an advanced option "Hide writing areas when going back to an earlier phase", on by default, that whoever steers can turn off and that applies to everyone on the board.

#### Scenario: Turned off
- **WHEN** the facilitator turns the option off and moves from Write to Previous actions
- **THEN** the writing areas stay visible and greyed as before

#### Scenario: Default
- **WHEN** a board is created without touching the option
- **THEN** it is on

#### Scenario: Older peer
- **WHEN** a peer that does not know the option joins
- **THEN** it ignores it and keeps the greyed composers, and the board still works
