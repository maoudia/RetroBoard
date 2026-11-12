# Proposal

## Why

People want to see each other's mouse cursors, like in a shared whiteboard. Sending cursors through the Durable Object would consume the free quota in a few retros a day (docs/PLAN.md 5.5). Cursors and presence are ephemeral and can travel peer to peer.

## What Changes

- WebRTC data channels between participants, signalled through the relay (encrypted signalling), STUN `stun.cloudflare.com`.
- Live cursors with name/avatar label and colour, interpolated, hidden when idle or in presenter mode.
- Presence (online, idle, typing in column X, currently speaking) over P2P.
- Relay fallback at 4 Hz with last-position-only semantics when P2P fails.
- Partial mesh above 12 peers and a display cap of 10 cursors.
- Profile setting to hide my cursor and to hide others' cursors.

Out of scope: TURN relaying (optional paid entitlement, see `licensing-and-monetization`), audio/video.

## Capabilities

### New Capabilities

- `presence`: live cursors and participant status, ephemeral and never stored.

### Modified Capabilities

None.

## Impact

- Context: Presence (ephemeral). Packages `sync` (signalling), `protocol`, `application`; web adapter for WebRTC.
- Free-plan budget: P2P path costs nothing; fallback path max 4 msg/s per active pointer, only while moving.
