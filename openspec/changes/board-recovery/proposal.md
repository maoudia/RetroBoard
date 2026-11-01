# Proposal

## Why

Owner feedback (2026-11-02): people reopening a board, from the link or from their recent boards, land on "Waiting for someone who has this board", even right after creating it. The local copy is what reopens a board when nobody else is online, and two defects can lose it: the retention sweep counted from the last write (not the last open) and could run while the board was opening. The waiting screen also never asks again.

## What Changes

- Local copy retention counts from the last time the board was opened, not only written.
- The start-up sweep never deletes a board this tab is opening.
- The waiting screen offers "Try again" and retries by itself every 20 seconds (the relay may have lost its memory or a holder may have just arrived).

Out of scope: any server-side storage (the relay stays memory-only).

Bounded contexts: team-space (local replica), presentation. No relay traffic change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Web: `replica-idb` adapter (usedAt on load, in-use rooms skipped by purge), `WaitingForBoard` retry.
