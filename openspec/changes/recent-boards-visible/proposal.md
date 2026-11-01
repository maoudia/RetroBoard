# Proposal

## Why

Owner feedback (2026-11-01): the recent boards exist but are hidden in the profile menu. A board is only reachable from its link, so a participant who goes back, closes a tab or comes back tomorrow feels the board is lost (#222).

## What Changes

- A reusable "My boards" list (title, theme dot, last opened, remove) placed where people land: the home page (prominent card, before the marketing sections), the creation page, and the board title menu ("Switch board").
- The profile menu keeps the full list and the clear action.
- Local only and sealed with the device key, as today: nothing is sent to a server.

Out of scope: syncing the list between devices, search, folders or tags.

Bounded contexts: Presentation and team-space (local). No relay traffic.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `profile`
- `board-session`

## Impact

- Web: a `RecentBoards` component used by the home page, `/new` and the board title menu; the recents store gains a relative "last opened" label.
