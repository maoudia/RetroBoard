# Design

## Decisions

- **Commands.** `chat.edit { id, text }` and `chat.delete { id }`, both ordinary signed board events (the same path as `chat.post`), validated by valibot (`text` trimmed, 1 to `CHAT_TEXT_MAX`).
- **Who may do what is decided in the fold, from the signed author.** `chat.edit`: only when the actor's `cid` equals the message's `cid` (nobody edits somebody else's words, not even a facilitator: it would put words in their mouth). `chat.delete`: the author, or an actor with `moderator` (facilitator or co-facilitator, the flag the ledger already sets). `chat.clear` stays privileged. Anything else folds to `fail('forbidden')` and is ignored by every peer alike.
- **Message shape.** `ChatMessage` gains optional `edited: true` and `removed: 'author' | 'moderator'`. A removed message keeps `id`, `at` and `removed`, and drops `text`, `cid` and `name` from state: the state itself never holds a removed text or its author (replicas, snapshots and the device copy are clean).
- **Tombstone, not vanish.** A removed message stays as a neutral row ("Message removed" / "Message removed by a facilitator"). Reason: the conversation keeps its rhythm and replies still point at something; people can tell a moderated line from a lost message; it avoids a moderator deleting silently. Tombstones count toward the 200-message cap and leave with `chat.clear`. A tombstone does not name the author (nobody is shamed in a team retro) but says who removed it (author or facilitator).
- **Deterministic fold and ordering.** The ledger orders events by `(at, id)` and refolds from a checkpoint when a late event arrives. An edit or a delete therefore always folds after its post when both are present, whatever the arrival order. An edit or delete of an unknown id (never seen, trimmed by the cap, or already cleared) folds to `fail('not-found')` and changes nothing. An edit of a removed message is ignored. Editing to the same text is a no-op (no "edited" mark, no dirty flag).
- **Rate limit.** Edits and deletes are events like any other and count in the per-author window; the UI disables the menu entries briefly when the limit is hit instead of showing an error toast.
- **History panel.** Chat commands are not reversible actions (the board history lists structure changes only); no change there.
- **Report and exports.** The chat is not part of the retro report or the exports; this stays true, so a removed message can never leak through them. A test guards it.
- **UI.** One "more" button (`mini-btn`, 44 px target on touch, 28 px with a larger hit area on pointer devices) per message row, visible on row hover and on keyboard focus within the row, opened by long press on touch; a menu with Edit and Delete (author) or Delete (facilitator on others). Edit replaces the text with a textarea in place; Enter saves, Shift+Enter newline, Escape cancels; the length counter shows near the limit. Facilitator clear keeps its header button and gets a confirmation dialog "Remove all N messages for everyone?".
- **Optional undo (last group).** The author's delete is held in the client for 5 s behind a "Message removed - Undo" toast and only then sent as `chat.delete`; closing the tab during the 5 s sends it immediately (`pagehide`). No new command and no change to the fold. Optional because it adds a pending state to the UI.
- **Compatibility.** Tabs that still run the previous version do not know the new commands and ignore them, so they keep showing the original text until they reload. Accepted: the chat is lateral, the static site is updated for everyone at once, and the board content never depends on it.

Where things live: handlers and types in `packages/domain/src/presence/chat.ts` and `shared`, schemas in `packages/protocol`, use cases in `packages/application/src/board/commands.ts`, snapshot mapping in `packages/domain/src/snapshot.ts`, UI in `ChatPanel.vue`.

Security and privacy note: the relay sees one more small encrypted envelope per edit or delete, nothing else. Deleting and editing hide the text in the folded state and on screen; they are not cryptographic erasure: the original `chat.post` event stays in the append-only log (as every event does), so a participant who held the room key at that time or who copies the log could still read it. The product therefore says "removed", not "erased", and never promises more; a late joiner's interface never shows the old text or a removed message.

## Open questions

- None blocking. A future "report this message" flow is not needed while the facilitator can remove it.
