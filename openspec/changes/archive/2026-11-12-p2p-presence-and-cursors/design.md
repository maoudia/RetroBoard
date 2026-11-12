# Design

## Context

Requires `stateless-relay-and-replication` (relay carries encrypted signalling envelopes of type `signal`).

## Goals / Non-Goals

**Goals:** smooth cursors at no relay cost; graceful degradation.
**Non-Goals:** guaranteed delivery, TURN by default.

## Decisions

- **Mesh topology** up to 12 peers; above, each peer keeps 6 connections chosen by a deterministic hash ring and gossips presence (cursors only to direct peers + relay fallback for the rest at 1 Hz).
- **Unreliable, unordered data channel** (`ordered:false, maxRetransmits:0`) for cursors; reliable channel for presence.
- **Anchored positions, not pixels**: layouts differ between participants (window size, density, a phone shows one column at a time), so a cursor is `{anchor, x, y}` where `anchor` is the column or note under the pointer and `x, y` are 0..1 fractions of that element's box (uint16 on the wire). Each receiver places the cursor in its own layout and hides it when the anchor is not rendered.
- **Encoding**: on the data channel, binary frames (anchor index, x, y as uint16, flags) encrypted with an HKDF-derived `presence` key. On the relay fallback, the same fields inside an `eph` envelope (already encrypted with the content key).
- **Touch devices (`pointer: coarse`)**: a finger only exists while it touches the screen, so phones do not stream a cursor. They send *focus* instead (column in view, note being edited or dragged, typing) and a cursor only during a drag. As receivers they do not draw floating cursors (too small a screen); they show avatar dots on the column tabs and on notes others are editing or dragging, and presence states in the participants menu.
- **Relay budget**: `eph` frames have their own per-connection window at the relay and excess frames are dropped silently (never a socket close), so cursors can never cost a participant their connection.
- **Delivery order**: the relay path (2.x, 3.x) shipped first; the WebRTC mesh (1.x) then took cursors off the relay without changing the UI.
- **Owner decision (2026-10-24): no dependency on server services, no vendor lock-in, never a paid Cloudflare service.** Cloudflare only serves the site and the strict minimum. So the mesh carries everything, not only cursors:
  - board events: on each link, the initial sync is `have` (the ids I hold), then the other side sends the envelopes I lack, then `synced`; new events are broadcast on the reliable channel and flooded (deduplicated by id) in partial meshes;
  - the relay keeps: the room's participant list, `sig` (encrypted offer/answer to one connection, its own budget, dropped when over), presence, and the fallback below. It no longer asks peers to re-seed its buffer;
  - a joiner is ready when the relay answered and one peer synced with it (or it is alone, or it fell back). The board is only created (genesis) when alone or after a peer confirmed none exists, so a slow link cannot fork it.
- **Fallback (owner choice: "peers + capped fallback")**: a participant with no direct link after 8 s, or with the "Direct links" setting off, is relay-only. It publishes through the relay (`pub`, buffered in memory, rate-capped by the existing budgets); the bridge (lowest connection id with the mesh) hands it the whole board once and forwards new events both ways. Relay-only participants share no cursors and no focus.
- **NAT traversal: STUN only, no TURN.** Default `stun:stun.cloudflare.com:3478` (free, no account), replaceable through `NUXT_PUBLIC_ICE_SERVERS` (a self-hosted coturn, for example). Non-trickle ICE (gathering capped at 1.5 s) so a link costs one offer and one answer on the relay.
- **Topology**: full mesh up to 12 participants; above, ring neighbours at distance 1 to 3 plus the opposite peer (diameter at most 4 for 30, unit tested). Cursors stay direct; focus is forwarded twice at most.
- **Interpolation** with a 100 ms buffer and `requestAnimationFrame`.
- STUN `stun.cloudflare.com:3478` (free per Cloudflare docs); TURN credentials only with an entitlement.
- Where it lives: `Cursor`, `PresenceState` value objects in `domain/presence` (no events); `PresencePort` in application; WebRTC adapter in `apps/web`; signalling relay already in `apps/relay`.

Security and privacy note: WebRTC exposes participants' IP addresses to each other (ICE candidates). The profile offers "relay-only cursors" to avoid sharing IPs with peers; the privacy page explains it.

## Signed snapshots (task 4.3, ADR-0037)

Decision record: `docs/adr/0037-*.md` (who signs, what a joiner verifies, the threat summary). In short:

- **Who signs**: the Ed25519 facilitator capability key of the genesis, the only key a joiner with an empty log can authenticate (the genesis event, shipped inside the snapshot, names it). Existing primitives only (`sign`/`verify`, AES-GCM envelope).
- **What it holds**: the ledger folded up to a cut (a checkpoint, a multiple of 200 events), the ids of the covered events, the signed genesis, `fold` (`LEDGER_VERSION`). Sealed like any envelope, so the relay, the replica and the journal never see plaintext.
- **What a joiner verifies**: envelope opens and header agrees; schema, sizes and fold version; genesis validly signed for this room; signer = genesis key = ledger facilitator key; signature over the canonical bytes; ids unique and contain genesis and cut. Any failure drops the snapshot and the joiner asks for the event log (a second `have` without `snapreq`).
- **With the event log**: the log of a snapshot-based joiner starts from the snapshot ledger and holds the covered ids as known; events after the cut are verified one by one. An event before the cut that the snapshot does not cover (an offline writer) makes the joiner collect the full log next to the snapshot-based one and swap it in once it holds a genesis. The log stays the source of truth.
- **With anti-entropy (ADR-0024)**: `snapreq` precedes `have`; a holder with a verified snapshot sends `snap` chunks, then the uncovered events, then `synced`. Peers that do not know `snapreq` ignore it and answer `have` as before. `have` lists include the covered ids.
- **With the replica write-ahead journal**: the adopted snapshot is appended to the replica as its own record (`snap:<id>`, ciphertext) and is not staged in the journal (which covers events the page already shows; a snapshot is large and can be fetched again); on load the events held fold first, and only a replica without a genesis resumes from its newest stored snapshot, verified again. The facilitator does not store its snapshots.
- **Malicious peer**: a forged or tampered snapshot fails the signature and the joiner falls back to the log; a stale snapshot is harmless because the tail after its cut is still delivered and verified; a replay into another room fails on the room binding. Inherited and unchanged: first valid genesis wins, a facilitator-signed snapshot that disagrees with the log is not detected by a joiner that never holds the covered events.
- **Not in scope**: relay carriage (the relay history stays at most 2,000 envelopes), snapshots signed by delegated keys, audit by holders.

## Risks / Trade-offs

- [IP exposure between peers] -> opt-out setting, documented.
- [CPU on large meshes] -> connection cap and cursor cap.
- [Firefox/WebKit data channel quirks] -> e2e matrix with two browsers per scenario.
