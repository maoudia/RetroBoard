# Proposal

## Why

Owner feedback (2026-11-08): a published post-it is hard to take back. Today the only ways are an inline edit or a delete that loses the idea. The owner wants to drag a published post-it back into the writing zone to change it, to get the same thing from the 3-dot menu when the person has the right to modify it, and an "unpublish" that sends an idea back to the private publishing area (the draft stack) instead of destroying it.

## What Changes

- **Edit in the writing zone.** Dragging a published post-it onto a column's writing zone, or choosing "Edit" in its 3-dot menu, loads its text and colour into that column's composer in an edit mode ("Save" / "Cancel"). The idea stays on the board, with its votes and its cluster, until the author saves; others see a light "being edited" mark (presence, not a board event). Saving sends the existing `note.edit` (and `note.color`).
- **Unpublish.** A new action, "Back to my drafts", in the 3-dot menu, and dropping a post-it on the draft stack of the writing zone. The idea leaves the shared board for everyone and lands in its author's private draft stack, ready to be rewritten and published again. One new signed command, `note.unpublish`, folded like a delete with a marker so the author's device can recover the text.
- **Who may do what.** The author can edit and unpublish their own ideas; facilitators can edit and unpublish any idea. A facilitator who unpublishes someone else's idea sends it back to its *author's* stack, never to their own. Frozen ideas and locked boards refuse as they do for delete.
- **Votes and clusters.** Unpublishing removes the idea's votes (confirmation when there are some) and is refused once voting is closed for a voted idea; a cluster left with one idea dissolves, as for a delete.
- **Undo, redo, history.** Unpublish is reversible like a delete: the idea comes back as a new one with its text, colour and column, and the draft leaves the stack. The history panel lists it ("sent back to drafts").
- **Motion.** The idea flies into the draft stack (reverse of the publish flight); reduced motion swaps it for an instant change.

Out of scope: editing someone else's text inside the author's composer (a facilitator edits through the same composer on their own device and sends `note.edit`); recovering drafts of a device that lost its local replica; unpublishing clusters as a whole (their ideas are unpublished one by one, or the cluster is dissolved first).

Bounded contexts: Ideation (domain command and fold), Voting (votes removed), Access (rights). Relay traffic: one event per unpublish, the same size class as a delete; no budget impact.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`: edit through the composer, unpublish, who may do what.
- `board-history`: unpublish is undoable and listed.

## Impact

- Packages: `protocol` (command schema), `domain` (ideation handler, freeze policy, limits), `application` (use case, inverse, history kind, draft recovery read model).
- Web: note menu, `PrivateSection` composer edit mode and drop targets, `NoteCard` drag source, toasts, guide chapter "Write and publish" (new step).
- i18n: fr and en for the menu items, the edit-mode bar, the confirmation, the toasts and the live announcements.
