# Proposal

## Why

Owner feedback (2026-11-08), in the owner's words: "When we start previous actions and there are some previous actions, it should be displayed to check their status. It's already the case. If there are no previous actions, maybe make a popup notification and propose to go to the new phase? Be creative." and "Going back from writing to previous actions should hide the writing areas by default. Can be disabled in board advanced options."

Today the Previous actions phase (kind `review`) only does something when carried-over actions exist: `ActionsReviewDialog` opens once and lists them. With nothing to review the phase is a silent, empty five minutes: the stepper says "Previous actions", the board looks like Write, and nobody knows what to do. And when the facilitator steps back from Write to an earlier phase, the writing areas of every column stay on screen as greyed, dashed composers (`PrivateSection` "gated"), which reads as "I can still write here" and takes the room the board needs.

## What Changes

- **An empty review phase becomes a guided moment, not a dead one.** When the agenda enters Previous actions and the board has no carried-over action that is still open, everyone sees a small, calm card ("Nothing to review from the last retro") with one primary action for the person who steers: **Start writing**. A toast-sized variant with the same action appears after a short pause, so the suggestion is made twice, never forced. Nothing advances by itself: the phase timer and the facilitator stay in charge.
- **Participants are told, not blocked.** Without steering rights the card says who will start writing and keeps the board readable; with "Everyone facilitates" (the default) everyone gets the button.
- **All previous actions closed is celebrated, briefly.** When carried-over actions exist but none is open, the review dialog is replaced by a one-line "All previous actions are done" with the same Start writing action, instead of a list of finished work.
- **Going back hides the writing areas.** Moving to an earlier phase after the board already holds ideas (for example Write to Previous actions) collapses the writing areas of all columns by default, with one banner: "Writing is closed in Previous actions. Show writing areas". One click shows them again, for this person, until the phase changes.
- **A board option turns this off.** In the board's advanced options, "Hide writing areas when going back to an earlier phase" (on by default) is shared by the whole board and set by whoever steers.

Out of scope: changing which commands each phase allows (`PHASE_COMMANDS`), a new phase, automatic phase changes, the end-of-phase popup and its timer behaviour (`phase-end-notifications`), carrying actions over (`actions-v2-and-carry-over`, archived).

Bounded contexts: Facilitation (agenda, one new board setting), Action tracking (the "nothing to review" signal, a read model), Ideation (the writing areas, view only). Presence is not touched.

Relay budget: none. The nudge is a local read model, the hide is a view rule, and the one new board setting rides on the existing `settings.update` event.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `retro-agenda`: the empty Previous actions phase, the all-done variant, hidden writing areas when going back, the board option.

## Impact

- Domain: one optional board setting (`hideWritingOnReturn`, default on) in the settings handler and the snapshot; no new command.
- Application: a read model `reviewState(snapshot)` (`'none' | 'open' | 'allDone'`) and `writingHidden(snapshot)` that decide what the web layer shows; both pure and unit tested.
- Protocol: `settings.update` gains the optional boolean; old peers ignore it and keep the greyed composers.
- Web: `ReviewNudge` (card and toast), the all-done line in `ActionsReviewDialog`, the collapsed writing areas and their banner in `PrivateSection`/`BoardColumn`, the option in `OptionsDialog` (advanced), fr and en keys, the user guide manifest entry for the agenda chapter.
