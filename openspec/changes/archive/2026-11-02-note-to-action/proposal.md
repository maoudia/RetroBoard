# Proposal

## Why

Owner feedback (2026-10-25): turning a note into an action takes too many steps (open the actions panel, retype the text, pick the owner). It must start from the note menu itself, with the note's author as default owner and a dropdown to change it.

## What Changes

- Note menu (and group menu) item "Create an action": opens the actions panel with a new action form filled with the note text (or the group title), owner set to the note's author when their name is shown, and the owner dropdown (connected participants first, then free text) to change it. Nothing is created until "Add" is pressed.
- The action keeps a link to its source note; the note shows a small action badge ("1 action"), and the action shows "from: <note text>" with a link that scrolls to the note.
- Allowed when the phase rules allow `action.add` (Rank and Actions phases, or no running agenda); otherwise the menu item is shown disabled with the phase-availability cue.
- Anonymous note: owner left empty (the author is never revealed).

Out of scope: auto-creating actions from every top note (actions-from-votes offers a list instead).

Bounded contexts: Actions (source link), Ideation (badge read model). One existing event (`action.add`) with an optional field.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `action-tracking`: action from a note.
- `notes`: action badge.

## Impact

- Domain: `action.add.sourceNote?: string` (a note or group id), kept on the action, cleared if the note is deleted; owner stays free text.
- Protocol: optional field in the action.add body.
- Web: menu items, prefilled form, `OwnerCombobox` connected-first ordering, badge on note and group cards.
