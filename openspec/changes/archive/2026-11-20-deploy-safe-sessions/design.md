# Design

## Context

A relay restart closes every WebSocket (a deploy, an eviction, a blip on one participant's network). Connection ids are chosen by the relay at each `welcome`, so every participant comes back under a new id. The WebRTC links between participants are unaffected by that, yet `ws.onclose` used to close the whole mesh (`PeerMesh` is keyed by connection id and `me`). This design covers task group 4 only; groups 1 to 3 (tolerant parsing, upload pacing, backoff) are done.

## Decisions

### D1. Links outlive the socket; the next `welcome` re-keys them

- `ws.onclose` no longer closes the mesh. Open links keep carrying board events and live frames while the relay is away; `relayNeeded` stays false when no link is missing, so nothing is queued for a socket that does not exist. A link that dies on its own (channel close, `failed`) is dropped as before.
- At the next `welcome` my own id changes: `PeerMesh.setMe(conn)` and `update(conns)` run on the same mesh instead of building a new one.
- The other participants' ids change too. A link is re-keyed when the owner announces itself, not guessed: see D2.

### D2. Matching old and new connection ids by session key

The session key (Ed25519, one per tab) is in every `presence` frame (`key`) and is stable across reconnects of the tab. The transport remembers it for every open link (`heldKeys: old connection id -> session key`), taken from the presence it already holds, before presence is pruned.

- A link is **held** (`PeerMesh.hold(conn)`) in two cases: at `welcome` for every open link (all ids changed), and on a `peers` frame for every open link whose id left the room (that participant reconnected alone). A held link survives `update`, which would close it as extra.
- When a presence arrives whose key is that of a held link, `PeerMesh.rekey(old, new)` moves the link to the new id, then the usual `onPeerOpen` runs on it (focus, cursor, `have`): events written while the relay was away are reconciled by the existing `have`/`env`/`synced` exchange, nothing new on the wire. The per-link sync state of the old id is dropped.
- Both ends re-key independently, each from the presence it receives; no frame is added.
- While a link is held, no offer is sent to a connection whose presence is unknown (`deferCall`): it may be the new id of a held link, and a second link to the same participant would be closed again. A presence that matches nothing starts the ordinary set-up at once (`update`).
- If a new link to the new id exists nevertheless (the other side offered first), the re-keyed link wins and the redundant one is closed.

### D3. Grace period: 30 s (`HOLD_MS`)

A held link nobody claims is closed after 30 s (`onClose` runs, then `update` sets up what is missing). The reconnect backoff is 10 s at most plus jitter (`backoffDelay`), and the presence follows the welcome by one round trip, so a participant that is coming back claims its link well inside the period; 30 s also stays under the time the browser takes to notice a dead peer by itself (ICE consent timeout). The period starts at the `welcome` (or the `peers` frame), not at the close: while the relay is down no id changes, so links are kept for as long as they are alive, and the board keeps working over them.

### D4. What happens when the key changes

A participant that reloads, or opens the board in another tab, has a new session key and no live link: nothing matches, and its old link is already dead (the page that held it is gone), so it is dropped by its own `close` event or at the end of the grace period. The new session gets its links through the normal set-up. A key that is announced by two participants claims at most one held link (the first), the rest set up normally.

### D5. The relay forgets a room when its last socket leaves

`RoomCore.leave` clears the `EnvelopeBuffer` (new `clear()`) when no other socket is connected, which covers `webSocketClose` and `webSocketError` on Cloudflare and the `close` of the Node adapter, whatever `sockets()` still lists. The next participant uploads what it holds at its welcome (the reseed that already exists). This matches the README promise and spec `board-session` (Board lifetime).

## Security and privacy note

What the relay observes is unchanged: the same frames in the same order (`welcome`, `peers`, encrypted `eph`/`sig`, `pub` when links are missing), no new frame and no new field. Matching is done locally, between participants, on a key that presence already carries sealed with the room key. The data channel is authenticated by DTLS to the remote it was negotiated with, so a re-key cannot move a link to a different machine; a participant who forges a presence with another's key can attribute that link's cursor frames to its own id, which any holder of the room key could already do with presence, and events stay signed and verified one by one. The relay now holds less (the buffer is dropped at the last close), never more.

## Out of scope

Protocol v3, snapshots of the relay buffer, deploying less often.
