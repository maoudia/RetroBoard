# Proposal

## Why

Owner feedback (2026-11-02): in private browsing, creating a board and then reloading, or reopening it, shows "Waiting for someone who has this board". Reproduced: without IndexedDB (some private modes) there is no local copy at all, and the relay keeps nothing, so a reload of the only participant finds nothing.

## What Changes

- When IndexedDB is unavailable or refuses to open or write, the encrypted copy is kept in the tab (sessionStorage). A reload, back and forward in the same tab reopen the board; closing the tab forgets it, which suits private browsing.
- Reads merge the durable and the tab copy, so a board written before a failure is still found.

Out of scope: any server-side storage (hard rule), cross-tab sharing in private modes.

Bounded contexts: team-space (local replica). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Web: `replica-session` adapter and the ports composition root.
