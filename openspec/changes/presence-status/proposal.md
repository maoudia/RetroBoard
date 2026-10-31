# Proposal

## Why

Owner feedback (2026-11-01): the board runs peer to peer, so links can be unstable. Everyone should see the connection state of each participant (a coloured dot) and who joins and leaves. Join popups should be an option chosen at board creation.

## What Changes

- A connection dot per participant in the participants menu and on presence markers: direct link (green), through the relay only (amber), reconnecting (grey, pulsing unless reduced motion), gone (no dot, listed under "Left"). The state is described in words for screen readers and in a tooltip.
- My own state is shown on my avatar with the same dot and a one-line explanation when not direct ("Connected through the relay: slower, still private").
- Joins and departures go to the activity feed (bell) for everyone.
- Board option "Announce arrivals" (creation form and board options, on by default): a short toast "Bob joined" and "Bob left", grouped when several people arrive together; off means feed only.

Out of scope: network diagnostics, history beyond the session, per-participant mute of popups.

Bounded contexts: Presence (ephemeral, local), Facilitation (board option). The dot uses data the mesh already has; no new relay traffic (a verifier on the relay-only path).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `board-session`

## Impact

- Application: pure `connectionState(peer)` read model and join/leave diffing for the activity log; web: dots, my-state line, feed entries, toast option in creation and options.
