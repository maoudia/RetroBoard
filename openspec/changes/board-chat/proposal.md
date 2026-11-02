# Proposal

## Why

Live retro feedback (owner, 2026-11-02): a lateral chat with all participants, minimalist and practical like the Google Meet one.

## What Changes

- A side panel (drawer on phones) with the board chat: text messages, author name, time; unread badge on the toolbar.
- End-to-end encrypted like the board, peer to peer with the relay as fallback; never stored on the server.
- Local storage budget: the chat keeps the last 200 messages per board in the encrypted replica, older ones are dropped; the whole replica respects a per-board size cap and the retention setting, and the profile shows the space used.
- Facilitators can clear the chat; messages are plain text (no files).

Out of scope: Reactions, threads, files.

Bounded contexts: Presence (chat messages as live events), Sync (replica budget).

## Capabilities

### New Capabilities

- `board-chat`

### Modified Capabilities

None.

## Impact

- Web: board page and its components; e2e on phone, desktop and TV.
