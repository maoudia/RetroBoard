# Design

## Context

Requires `stateless-relay-and-replication` (relay carries encrypted signalling envelopes of type `signal`).

## Goals / Non-Goals

**Goals:** smooth cursors at no relay cost; graceful degradation.
**Non-Goals:** guaranteed delivery, TURN by default.

## Decisions

- **Mesh topology** up to 12 peers; above, each peer keeps 6 connections chosen by a deterministic hash ring and gossips presence (cursors only to direct peers + relay fallback for the rest at 1 Hz).
- **Unreliable, unordered data channel** (`ordered:false, maxRetransmits:0`) for cursors; reliable channel for presence.
- **Encoding**: 8-byte binary frames (x, y as uint16 normalised to the board, flags), encrypted with an HKDF-derived `presence` key; no JSON.
- **Interpolation** with a 100 ms buffer and `requestAnimationFrame`.
- STUN `stun.cloudflare.com:3478` (free per Cloudflare docs); TURN credentials only with an entitlement.
- Where it lives: `Cursor`, `PresenceState` value objects in `domain/presence` (no events); `PresencePort` in application; WebRTC adapter in `apps/web`; signalling relay already in `apps/relay`.

Security and privacy note: WebRTC exposes participants' IP addresses to each other (ICE candidates). The profile offers "relay-only cursors" to avoid sharing IPs with peers; the privacy page explains it.

## Risks / Trade-offs

- [IP exposure between peers] -> opt-out setting, documented.
- [CPU on large meshes] -> connection cap and cursor cap.
- [Firefox/WebKit data channel quirks] -> e2e matrix with two browsers per scenario.
