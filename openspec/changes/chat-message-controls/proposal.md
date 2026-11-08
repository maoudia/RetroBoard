# Proposal

## Why

Owner feedback (2026-11-08): "The facilitator can remove all or specific message in the chat. A user can remove a specific message or edit it. Like Google Meet features for example. Be creative and KISS."

The chat only has `chat.post` and a facilitator-only `chat.clear`. A typo cannot be fixed, a message sent in haste cannot be taken back, and a facilitator who needs to remove one inappropriate line has to wipe the whole conversation. Everyday chat tools let people fix their own words and let hosts moderate; RetroBoard should too, in the smallest way that stays correct on a replicated, signed, end-to-end encrypted log.

## What Changes

- **Edit your own message.** The author edits a message they sent. The message shows a small "edited" mark. No time limit (KISS: it needs no clock in the fold; the chat keeps only 200 messages anyway).
- **Delete your own message.** The author deletes it. A neutral tombstone ("Message removed") stays in the conversation, so replies still make sense; the text and the author name are gone from every replica's state.
- **Moderate.** A facilitator or co-facilitator deletes any message (tombstone "Message removed by a facilitator") and can still clear the whole chat, now with a confirmation that says how many messages go. Participants cannot delete or edit the messages of others.
- **One small menu per message.** A "more" button appears on hover and keyboard focus and after a long press on touch, with Edit and Delete for the author and Delete for a facilitator. Inline editing in place (Enter saves, Escape cancels).
- **Optional delight: undo a delete.** After deleting their own message, the author sees "Message removed - Undo" for 5 seconds; the delete is only sent when the 5 seconds pass. Marked optional, last task group.
- Two new signed commands, `chat.edit { id, text }` and `chat.delete { id }`, folded deterministically by every peer, rate-limited like any other event.

Out of scope: reactions, replies and threads, message search, per-message read receipts, chat export (the chat is not in the report today and stays out), the floating button (`chat-floating-dock`), cryptographic erasure of the log (see the privacy note in the design).

Bounded context: Presence (chat). Domain command handlers, protocol schemas, a chat panel change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-chat`: edit, delete, moderate, tombstones, per-message menu.

## Impact

- Packages: domain (`chat.edit`, `chat.delete`, message shape with `edited` and `removed`), protocol (two valibot schemas), application (`BoardCommands` use cases, snapshot read model).
- Web: `ChatPanel.vue` message row, i18n (fr, en), the guide chapter `people` (updated and regenerated in the same pull request).
- Free-plan budget: one small event per edit or delete, inside the existing 60 events per 10 s per author fold limit; no new traffic class.
