# Design

## Decisions

- **Edit is not unpublish.** Edit keeps the note published: the composer is only a better editor (signature, colour, length counter) and "Save" sends the existing `note.edit` / `note.color`. Nothing changes for the others until the save, so a half-written change is never visible and a cancelled one leaves no trace. Rejected: unpublishing to edit (it would drop the votes and the place of the idea on every edit).
- **Unpublish is a command, not a delete plus a draft.** `note.unpublish { id }` is a signed event that every peer folds the same way as `note.delete` (note removed, votes gone, cluster normalised). It exists as its own type so the history can say what happened and so the author's device can recognise "my idea was sent back" and recover the text. Rejected: a client-side "delete then add a draft" (a facilitator's client cannot write to another person's draft stack, and a crash between the two would lose the idea).
- **Where the text goes.** The event carries no text (it would be forgeable and heavier). The author's device already holds the text: when it folds a `note.unpublish` for a note it owns (`ownerCid` is its own), it reads the note from the state before that event and puts text and colour at the top of the draft stack of the note's column. The ids of handled unpublish events are kept in the local draft store, so a replay, a second tab or a late join never duplicates a draft. If the author is offline, the recovery happens when the log is folded on their next visit.
- **Facilitator unpublishing another person's idea.** It goes back to the *author's* stack. Alternatives: into the facilitator's own stack (it would hand someone else's words to a person who did not write them and break "private until published"), or refusing (the facilitator would be pushed to a destructive delete). The author is told with a toast ("Sam sent your idea back to your drafts") and the text is theirs again. If the author's device cannot recover it (a different device, a lost replica), the idea is gone exactly as with a delete; the confirmation shown to the facilitator says so only in that case (anonymous ideas show the same wording).
- **Votes.** The idea's votes are removed with it, as for a delete, because a re-published idea is a new idea. A confirmation shows the count. Once voting is closed (results shown), unpublishing a voted idea is refused with `voting-closed`: results are not rewritten after the fact. Unvoted ideas can still be unpublished.
- **Cluster.** `normalizeGroups` runs as for delete: a cluster left with fewer than two ideas dissolves and its vote count goes with it.
- **Frozen, locked, pinned.** A frozen idea (or one in a frozen cluster) is refused (`frozen`), the existing `touchesFrozen` list gains `note.unpublish`. A locked board refuses (`locked`) like delete, for facilitators too. A pinned idea asks the same confirmation as delete and loses its pin.
- **Edit rights.** Unchanged from `note.edit`: author, or moderator also on a locked board; frozen refuses. The menu shows "Edit" only when the command would be accepted, with the reason in the tooltip when it is not.
- **Drag targets.** The writing zone of a column is the drop target for Edit (the zone highlights with "Edit here"), the draft stack inside it is the drop target for Unpublish ("Back to my drafts"). A drop elsewhere does what it does today (move, group). Both have menu items, which is the single-pointer alternative required by WCAG 2.5.7; keyboard users reach them from the focused note (menu key, or the 3-dot menu).
- **Being-edited mark.** Presence (peer to peer, ephemeral, already used for "who is typing"), never a ledger event. It is informative: two people can still both edit, the later `note.edit` wins (last writer in the total order), and the first sees the edited mark change.
- **History.** `inverseOf` gains `note.unpublish`: the inverse is `note.add` with the same column, text and colour (like delete) plus removing the recovered draft; redo is not offered (new id), same as delete. The history log lists the action with kind `unpublish`; rewind treats it like a delete (the idea comes back as a new one).

## Where it lives

- `packages/protocol`: schema of `note.unpublish` (id), size limit like delete, version rule: peers that do not know the command ignore it (unknown commands are refused by the fold), so an older client keeps the idea on its board until it updates; documented as a rolling-update caveat.
- `packages/domain/ideation`: handler `note.unpublish` (same body as `note.delete` with the error order below), `touchesFrozen`, a marker on the removed note kept only in the fold's dirty report (no state added).
- `packages/application`: `unpublishNote(id)` use case, `inverseOf`, history kind and label, read model `recoveredDrafts(before, after, me)` that lists my notes removed by an unpublish event, and the draft-stack port to receive them.
- `apps/web`: `NoteMenu` items, `PrivateSection` edit mode and drop targets, flight composable (reverse flight), toasts, live region.

Error order (so every peer refuses the same way): locked, not-found, forbidden (not author and not moderator), frozen, voting-closed (voted idea), then the removal.

## Security and privacy

The relay sees one more event type of the same size class as a delete, never the text. Drafts never leave the device; the recovery reads local state only. A facilitator can remove someone's idea from the board (as they can with delete) but cannot read or take it into their own stack.

## Risks

- A rolling update: clients that predate the command do not remove the idea. Mitigated by the protocol version note and a one-release overlap where the menu item is hidden unless every present peer announces support (presence carries a capability flag).
- Two devices of the same author: the recovery lands on the device whose `ownerCid` matches, which is the one that wrote the idea.
