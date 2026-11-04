# Proposal

## Why

Owner feedback (2026-10-29): the owner likes presenter mode and wants new ideas, in particular a focus on one column: the focused column zoomed and centred while the others shrink around it, or an accordion layout, with the choice of style. (The toolbar zoom bug is a separate bug issue.)

## What Changes

- Column focus in presenter mode: centre zoom with the other columns shrunk around it, or accordion; the facilitator picks the style; arrow keys move the focus.
- Note spotlight: one note enlarged for the discussion, the others dimmed.
- Voted ideas walk-through: next and previous through the ranking during the discussion.
- Facilitator laser pointer on the shared screen (peer to peer, presenter only).
- Moved here from postit-visual-system 1.3: the column focus mode.

Out of scope: TV layout sizes (responsive-and-i18n-hardening 2.3), the toolbar zoom bug (bug issue).

Bounded contexts: Facilitation (presentation), Presence (peer to peer pointer). Pointer traffic stays peer to peer.

## Capabilities

### New Capabilities

- `presentation`

### Modified Capabilities

None.

## Impact

- Web: presenter layouts, spotlight, walk-through, pointer; no domain change except a local view state.
