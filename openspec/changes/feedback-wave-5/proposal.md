# Proposal

## Why

Owner feedback of 2026-11-04, from a real retrospective run with the live app. The presenter view wastes space and its zoom and vote chip look unfinished; the agenda end shows a fake link and leaves voting open; the chat roster is unusable with many people; the writing-size icons and the link icon are loud and unclear; an open cluster needs sideways and vertical scrolling and clips its actions; and the voted-ideas walk-through hides the whole board. These go into the next release.

## What Changes

1. Presenter space: in the focused column notes get a wide measure, a long idea takes the full row and wraps in a readable line length; no narrow strip next to empty space.
2. Presenter zoom (spotlight) and vote chip: bigger, length-aware type, column chip, a small tabular vote chip whatever the note text size, wider card.
3. "Agenda finished" and "not started" in the phase stepper are plain text; only a running phase keeps the elapsed/left switch.
4. The end of the agenda (last phase left, or "end the retro") closes voting and shows the results, by a deterministic event on the ledger.
5. Chat roster: with more than four people the chips fold into an overlapping avatar strip (typing floats up, +N overflow); one tap opens the full wrapped roster. No horizontal scroll.
6. Writing size: three neutral outlined squares (small, medium, large) replace the coloured ones; "same size for every column" is a columns icon, not a link.
7. Open cluster: the notes wrap in a grid that never exceeds the panel; the actions wrap on the panel width; no sideways scroll, and vertical scroll only as a last resort.
8. Voted-ideas walk-through: no dimming scrim; a dock at the bottom, the board slides to the idea and rings it in place; a double-chevron button goes back to the most voted idea.

## Capabilities

### Modified Capabilities
- `presentation`: space, zoom, vote chip, walk-through.
- `retro-agenda`: plain text end state, end of agenda closes voting.
- `board-chat`: roster for many people.
- `board-layout`: writing-size control.
- `grouping`: open cluster layout.
- `ui-coherence`: no hiding of the board by a modal when a dock is enough.

## Impact

Domain: `agenda.next` and `agenda.end` also set `votingClosed`. Web: PhaseStepper, ChatPanel, PrivateSection, GroupPanel, PresenterSpotlight, PresenterWalk, NoteCard, base.css. No relay traffic change, no storage.
