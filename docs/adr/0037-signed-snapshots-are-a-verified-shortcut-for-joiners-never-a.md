---
status: accepted
date: 2026-11-11
decision-makers: Moncef Aoudia
---

# Signed snapshots are a verified shortcut for joiners, never a replacement for the event log

## Context and Problem Statement

A participant who joins a long board folds every event: it opens, parses and verifies one Ed25519 signature per event (3,000 events are 3,000 signatures) before the board is shown, and the relay buffer only keeps the last 2,000 envelopes. The architecture notes (5.2) and the `Snapshots` requirement of OpenSpec change `p2p-presence-and-cursors` (task 4.3, moved from `stateless-relay-and-replication`) promise a signed snapshot that lets a joiner skip the history. Signatures decide what a joiner trusts, so the question is who may sign one, what a joiner checks, and how it composes with ADR-0024 (two paths, anti-entropy on every connection) and the replica journal.

## Decision Drivers

* No server-side storage, no paid service, existing crypto primitives only (ADR-0018, ADR-0020)
* A board must never silently lose or fork (ADR-0024): a snapshot must not make two replicas disagree
* A malicious participant (anyone with the link) must not be able to make a joiner trust a state the facilitator did not sign

## Considered Options

* Snapshot as a verified shortcut: signed by the facilitator capability key, adopted only by a joiner with an empty log, covered event ids listed, any event the snapshot does not cover upgrades the joiner to the full log
* Snapshot as a log event (`SnapshotTaken`) that every replica obeys, dropping uncovered events before the cut
* Snapshot signed by any current co-facilitator

## Decision Outcome

Chosen option: "Snapshot as a verified shortcut", because it is the only option that stays lossless with offline writers (ADR-0024 "local first": an event written offline for hours still sorts before the cut) while keeping the event log the single source of truth.

* **Who signs.** The Ed25519 facilitator capability key of the genesis (the key in the facilitator link, root of trust of the ledger). Not a delegated session key: the joiner has no ledger yet, so the only key it can authenticate is the one named by the genesis event. A board whose root holder never comes back simply has no new snapshot and joiners use the event log.
* **What is signed.** `rb/snapshot/v1 \n room \n canonicalJson({v, fold, room, id, cut, genesis, ids, ledger, author})`: the ledger folded up to a cut of the total order, the ids of every covered event, and the signed genesis event. The snapshot travels as an ordinary sealed envelope (AES-GCM, content key), so the relay, the replica and the journal see ciphertext only.
* **What a joiner verifies before it trusts it** (any failure means the snapshot is dropped and the joiner asks the same peer for the event log, which still works):
  1. the envelope opens with the content key and its header agrees (room, id);
  2. the schema, the sizes and `fold` (the version of the fold rules, `LEDGER_VERSION`) match this client;
  3. the embedded genesis event is itself validly signed, names this room and is signed by the key it announces;
  4. `author` equals the genesis facilitator key and the ledger's facilitator key;
  5. the signature over the canonical bytes verifies;
  6. the covered ids are unique, contain the genesis and the cut.
* **Adoption.** Only a participant who has no board yet (no genesis in what it holds: an empty log, or just the tail the relay kept) adopts a snapshot; a returning participant keeps ordinary anti-entropy. The log then starts from the snapshot ledger, treats the covered ids as held, and folds the events after the cut as usual, each verified individually. The relay history (at most 2,000 envelopes, ADR-0024) is still verified event by event: the snapshot bounds the part of the sync that was not bounded, the peer-to-peer one.
* **Composition with anti-entropy (ADR-0024).** The joiner asks for a snapshot with a new `snapreq` peer frame before its usual `have`; a holder that has a verified snapshot answers with `snap` chunks, then only the events the snapshot does not cover, then `synced`. A peer that does not know the frame ignores it and answers the `have` as before. After a rejected snapshot the joiner sends `have` again without `snapreq` and receives the whole log. `have` lists of a snapshot-based log include the covered ids, so no peer re-sends them.
* **Events the snapshot does not cover.** An event that sorts before the cut but is not in the covered ids (an offline writer) cannot be folded onto the snapshot ledger without breaking the total order. The joiner then asks its peers for the full log next to the snapshot-based one (the board keeps showing the snapshot-based state) and swaps it in once it holds a genesis and the stream went quiet: the replica ends with the same state as every full-log replica. The same rebuild runs before a `.retro` board file is exported, and the history panel of a snapshot-based log lists the actions after the cut only. Snapshots never change what the log means.
* **Replica and journal.** A joiner appends the adopted snapshot envelope to its replica as a record of its own (`snap:<id>`, ciphertext like every record), so a reload reopens from it; it is not staged in the write-ahead journal, which exists for events the page already shows (a snapshot is large and can be fetched again). On load the stored events fold first: a replica that holds a genesis is a full log and the snapshot is ignored, otherwise the newest stored snapshot is verified again and the events held fold after it. The facilitator does not store its own snapshots (it holds the full log and builds a new one at the next threshold).
* **Who produces them.** The browser holding the facilitator link, when at least 1,000 events (setting `SNAPSHOT_EVERY`) lie beyond the previous snapshot and at least 60 s before the newest event, so recent stragglers stay in the tail. The cut is a ledger checkpoint (a multiple of 200 events), so the signed ledger is the one the log already computed. It is sent to every direct link and forwarded once. The e2e suite lowers the threshold through the browser setting `retroboard:snapshot` (never below 200 events, the checkpoint size).
* **Relay.** No change: snapshots are peer to peer only. A participant without direct links still gets the relay history (at most 2,000 envelopes), as before.

### Threat summary

* **Forged snapshot by a participant** (link holder, no facilitator key): the signature does not verify, the joiner drops it and falls back to the event log. Tampering with any field of a genuine snapshot (ledger, ids, cut, genesis) is the same case.
* **Wrong-key snapshot** (valid signature by a key that is not the genesis key): rejected at step 4. A participant who already knows the board also drops, without keeping or forwarding it, a snapshot whose signer is not the facilitator key of its own ledger, so a snapshot rooted in an attacker's genesis does not spread to holders and is not served to later joiners.
* **Replay into another room**: the signed bytes and the envelope AAD carry the room.
* **Stale snapshot** (genuine but old, served by a peer that has no newer one, or on purpose): safe, because everything after its cut is still delivered and verified event by event; a peer that withholds the tail can already withhold events today. A stale snapshot never hides a later `board.destroy`, `participant.remove` or reset: those are events after the cut.
* **Snapshot with a covered set that hides an event**: the event is not covered, so it is delivered and either folds after the cut or upgrades the joiner to the full log.
* **Fold-rule skew** (a client with other rules signed it): `fold` mismatch, dropped.
* **Memory and bandwidth abuse**: chunks are bounded (4 MiB total, 256 chunks), reassembly is per link and dropped on any error; a snapshot is only accepted when the log is empty.
* **Not covered (inherited, unchanged):** the first valid genesis in the total order wins on both paths, so a link holder who forges a genesis with another key can already fork the board for a joiner, with or without snapshots (a joiner who adopted such a snapshot recovers when a genuine peer sends the real genesis: it sorts before the cut and is not covered, which rebuilds the full log); the holder of the facilitator key can already steer the board, and a snapshot they sign with a state that differs from the log is not detected by a joiner until it holds the covered events (audit by holders is future work).

### Consequences

* Good, because a joiner verifies one signature plus the tail instead of one per event, and the board appears as soon as the snapshot is adopted
* Good, because every failure path ends in the event log, which is unchanged
* Good, because no new primitive, no server storage and no relay change
* Bad, because a snapshot is O(state) plus the covered ids (about 27 bytes per event), not tiny
* Bad, because a joiner that adopted a snapshot does not audit the facilitator's state until an uncovered event forces the full log
* Bad, because every release that changes the fold rules must bump `LEDGER_VERSION`, or old snapshots are trusted with new rules

## More Information

Builds on ADR-0004 (keys in the link), ADR-0005 (facilitator), ADR-0024 (anti-entropy). OpenSpec change `p2p-presence-and-cursors`, task 4.3 and design "Signed snapshots".
