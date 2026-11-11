# Design

## Decisions

- **Removal** cannot stop someone who still has the room key from reading future events: the honest fix is key rotation, described in "Fresh link" below. A removed participant never gets the new key.
- **Rename**: `participant.rename { key, name }` by the facilitator overrides the label shown for that session key on this board; the participant sees "renamed by the facilitator".
- **Reveal all**: `drafts.reveal { at }` (privileged) starts a countdown; each client publishes its drafts when `at` passes, skipping drafts flagged "keep private" locally. Drafts never leave a device before that, so the facilitator never sees them early.

Where things live: role events in `packages/domain/access`, room migration in `apps/web` transport with sealing from `packages/crypto`, reveal in application + web.

Security and privacy note: the relay sees one `room.moved` frame per remaining participant and the new room's usual traffic; it never sees keys, a link or board content ("Fresh link" below).

## Fresh link (task group 2)

ADR-0034 settles the question that blocked 2.1: the signature of an event is bound to the room id, so the new room keeps the **signing domain** of the first one. Nothing is re-signed and the fold does not change.

### Key ring

`move` builds a new `KeyRing`: new `roomId` and `roomKey` (128 bits each, `newKeyRing()`), the same `facilitatorSecret` when the facilitator holds one (a removed participant never held it, and the facilitator key is the root of trust in the genesis), the same `passcode` flag, and `signRoomId` = the signing domain of the room being left. The participant link is `#r=<room>&k=<key>&d=<domain>` (+ `&p=1`). The content key is `HKDF(roomKey, roomId, "rb/content/v1")` as ever, so it is a fresh key unrelated to the old one: knowing the old key tells nothing about the new one.

### Steps (facilitator, one action)

1. The dialog opens with the removed participant: the roster of connections present at that moment is frozen (a removed person who comes back under a new session key afterwards is not on it).
2. `participant.remove` is published in the old room (signed log, as in group 1).
3. The facilitator's client seals the events of its own log under the new room and key and keeps them in the local copy of the new room. No board content is uploaded to the relay for the move.
4. One `room.moved` frame per remaining participant is sent in the old room (`eph`, never buffered by the relay): `{to: conn, ct}` where `ct = sealTo(participant's X25519 key, {link, by, sig})`. `by`/`sig` is a signature of the lead (the facilitator or genesis key) over `rb/room-moved/v1 \n old room \n participant key \n link`: the frame is outwardly encrypted with the old room key (which a removed person holds), so the signature is what stops them from sending the team to a link they control.
5. After a short settling delay the facilitator publishes `board.destroy` in the old room, then opens the new link. The old room is closed for good in every replica that folds it.

### Remaining participants

A client that receives a `room.moved` frame addressed to its connection opens it with its X25519 key (derived from the session key, announced in presence as `xkey`), checks the signature against the lead of its own ledger and the link against its own signing domain, seals its own log under the new room, moves its drafts, passcode and recent-boards entry, and opens the new link. Anything that does not check out is dropped without a trace.

### What a removed participant can still see

- Everything they saw before: the old room, its content and its history in their browser. Rotation cannot take back what was shown.
- In the old room after the removal: the signed `participant.remove` (and that a move happened: the `room.moved` frames, one per remaining participant, and the closing `board.destroy`). They cannot open a frame (sealed to other people's X25519 keys), so they do not learn the new room id, the new key or the link.
- Nothing of the new room: not its id (sealed), not its key, not its events (AES-GCM under a key they never had). The relay cannot give them what it has not got.
- The old link opens an empty, closed room: `board.destroy` is folded by every replica and the page says so.

### What the relay observes

Nothing new in kind, ciphertext only. During a move: one extra connection to a new room id at the end (the new board's usual traffic), one `eph` per remaining participant in the old room (as big as a presence frame), and one event for the removal and one for the closing. It never sees a key, a link or a name, and it does not receive the board as a burst: every client already holds it.

### Failure cases

- **A participant is offline** (or has no X25519 key yet, or joined after the roster froze): they get no frame. Their old link opens the closed room; the dialog tells the facilitator how many people will be moved and that the rest must be sent the new link (share dialog or join code, which already seal it to the person). Their local copy of the old board is deleted by the closing, as for any destroyed board; the board is whole in the new room.
- **A frame is replayed or forged**: wrong signer, wrong room, wrong domain, a link with a facilitator secret, or a link to the same room are all dropped.
- **A removed person comes back with a fresh session key after the freeze**: not on the roster, so no frame. Before the freeze they are indistinguishable from a new participant: the roster in the dialog shows who is here; move again if in doubt.
- **The facilitator's tab closes mid-move**: the removal is already in the log; the move can be done again from the same dialog (a second move starts from the room the facilitator is in).
- **No local copy storage** (private modes): the new room starts empty on the participant's side and fills from the others and the relay as for any join.

Where things live: ring and link in `packages/domain/src/access/keyring.ts`; `room.moved` and `xkey` in `packages/protocol`; sealing, signing and reading the frame in `apps/web/app/transport/room-move.ts`; the move itself in the encrypted transport; the dialog and the closed pages in `apps/web`.

