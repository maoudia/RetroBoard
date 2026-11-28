# retro-agenda Specification

## Purpose
Structures a retro as a time-boxed sequence of phases and shows everyone where the team is in the overall time budget.

## Requirements

### Requirement: Predefined agenda
The system SHALL offer a default one-hour agenda (check-in, previous actions, write, group, vote, ranking, actions, close) and SHALL let the facilitator edit phases and durations at creation.

#### Scenario: Default agenda
- **WHEN** a facilitator creates a board without editing the agenda
- **THEN** the board has 8 phases totalling 60 minutes

### Requirement: Global countdown ring
The system SHALL show every participant a ring divided into one segment per phase, filled according to elapsed time, and SHALL expand it into a panel listing phases with planned, elapsed and remaining time.

#### Scenario: Expand the ring
- **WHEN** a participant clicks the ring during the Write phase
- **THEN** a panel shows each phase, marks Write as current and shows its remaining minutes

### Requirement: Phase control
The facilitator SHALL be able to start, pause, resume, extend, skip and end phases; extending a phase SHALL take the time from later phases unless the facilitator chooses to extend the total.

#### Scenario: Borrow time
- **WHEN** the facilitator extends Write by 3 minutes with "take from later phases"
- **THEN** the total stays 60 minutes and later phases are shortened proportionally

#### Scenario: Overtime
- **WHEN** a phase reaches zero and the facilitator does nothing
- **THEN** its ring segment shows overtime and a discreet notice is shown to the facilitator

### Requirement: Phase rules
The system SHALL enable the actions relevant to the current phase and SHALL keep other actions available only to the facilitator, with an option to disable phase rules.

#### Scenario: Voting outside the vote phase
- **WHEN** phase rules are on and the current phase is Write
- **THEN** vote buttons are hidden for participants

### Requirement: Auto-publish at end of writing
The system SHALL offer a setting that publishes every participant's drafts when the Write phase ends.

#### Scenario: Write phase ends
- **WHEN** auto-publish is on and the Write phase ends with 2 drafts on a participant's device
- **THEN** the 2 drafts are published

### Requirement: Go to closing
A facilitator SHALL be able to jump to the close phase from any phase after a confirmation, and the report SHALL show the actual time of every phase.

#### Scenario: Short on time
- **WHEN** the facilitator chooses Go to closing during the Group phase
- **THEN** the board is in the close phase and skipped phases show no actual time

### Requirement: Global time follows the real time spent
The global elapsed time of the retro SHALL be the time actually spent in finished phases plus the time of the running phase; skipping a phase SHALL NOT add its planned time, and the planned total SHALL NOT change.

#### Scenario: Skipping a phase
- **WHEN** the facilitator moves to the next phase one minute into a fifteen minute phase of a one hour retro
- **THEN** the global elapsed time is one minute and the global time left is fifty-nine minutes

### Requirement: Phase detail from the progress bar
Each segment of the phase bar SHALL open, on click or keyboard activation, a popover with the phase name, the real time spent in it and its planned time.

#### Scenario: Finished phase
- **WHEN** Bob activates the segment of a phase that ran for 4:12
- **THEN** a popover names the phase and shows 4:12 spent of the planned time

#### Scenario: Skipped phase
- **WHEN** Bob activates the segment of a phase that was left without time spent
- **THEN** the popover says it was skipped

### Requirement: Start and pause inside the ring
The start, pause and resume control of the agenda SHALL be part of the ring component, in the same frame as the rings and the time.

#### Scenario: Facilitator
- **WHEN** the facilitator looks at the toolbar clock
- **THEN** the play or pause button is inside the clock frame, and participants see no button

### Requirement: Elapsed or remaining time
A participant SHALL be able to choose, separately for the phase stepper and for the global ring, whether they show the elapsed or the remaining time; by default the stepper SHALL show elapsed time and the ring SHALL show remaining time.

#### Scenario: Defaults
- **WHEN** Bob opens a running retro for the first time
- **THEN** the stepper shows how long the current phase has run and the ring shows the time left for the retro

#### Scenario: Switch
- **WHEN** Bob sets the stepper to remaining time
- **THEN** the stepper shows the time left in the phase and the ring is unchanged

### Requirement: Visible overtime
A phase past its planned time SHALL show zero time left in the overtime colour, then the time over as "+m:ss".

#### Scenario: Two minutes over
- **WHEN** the Group phase is two minutes past its planned time
- **THEN** the stepper segment is in the overtime colour and reads "+2:00"

### Requirement: Gated controls cue
Every control disabled by a phase rule SHALL use the same visual cue and SHALL expose the reason to assistive technologies; a phase change SHALL be announced with what opened and what closed.

#### Scenario: Screen reader on phase change
- **WHEN** the facilitator moves from Write to Group
- **THEN** a polite live region announces that grouping opened and writing closed

#### Scenario: Same cue for votes and notes
- **WHEN** the Write phase is current
- **THEN** vote controls and any other gated control show the same greyed style and lock icon as a closed composer

### Requirement: Previous phase
The facilitator SHALL be able to go back to the previous phase, which resumes with the time it had left.

#### Scenario: Back to writing
- **WHEN** the facilitator moved to Group by mistake while Write had 3 minutes left
- **THEN** going back resumes Write with 3 minutes left for everyone

### Requirement: The end of the agenda closes voting
When the last phase is left or the retro is ended, voting SHALL close and the results SHALL be shown.

#### Scenario: End the retro while voting is open
- **WHEN** the facilitator ends the agenda
- **THEN** voting is closed for everyone

### Requirement: Plain end state in the stepper
The stepper SHALL show "finished" and "not started" as plain text; only a running phase offers the elapsed or left switch.

#### Scenario: Agenda finished
- **WHEN** the agenda is finished
- **THEN** the stepper line is not interactive

### Requirement: Player-style agenda panel
The agenda panel SHALL be driven by an icon-only transport bar placed outside the rings, with play or pause as its leading button, and SHALL offer one button that restarts every chronometer after a second confirming tap.

#### Scenario: Restart everything
- **WHEN** the facilitator taps restart twice
- **THEN** the agenda is back on its first phase with no time spent, the board timer is reset and voting is open

### Requirement: Automatic chained agenda
New boards SHALL start with an automatic agenda: it starts at creation and each phase hands over to the next when its planned time elapses, announcing the change, unless a facilitator extends the phase.

#### Scenario: Phase time elapses
- **WHEN** the planned time of the running phase is over and it was not extended
- **THEN** the agenda moves to the next phase and announces it

### Requirement: Activity rings
The system SHALL show the retro's progress as concentric rings: an outer ring for the whole retro and inner rings for the current and next phases, and SHALL continue a ring past a full turn in the overtime colour when time runs over.

#### Scenario: Middle of the Write phase
- **WHEN** 20 of 60 planned minutes have elapsed and Write is half done
- **THEN** the outer ring is one third full and the current-phase ring is half full

#### Scenario: Overtime
- **WHEN** the current phase runs 2 minutes over its 5
- **THEN** its ring completes a full turn and continues in the overtime colour

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
