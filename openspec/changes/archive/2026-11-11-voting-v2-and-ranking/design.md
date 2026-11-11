# Design

## Decisions

- `Ballot` aggregate in `domain/voting` with `VotePolicy` value object; items referenced by `VotableRef = { kind: 'note'|'cluster', id }`.
- Hidden counts: votes are normal encrypted events; read models hide others' votes until `TallyRevealed`. A technical participant could read them from the log; the UI labels this mode "hidden" not "secret".
- Sealed ballot: see "Sealed ballot" below. Each vote is one sealed ballot readable only with the facilitator's ballot key; the facilitator device tallies and publishes a signed reveal of counts only.
- Ranking read model: dense ranking with ties ("1, 2, 2, 4"), podium component with rise animation in `packages/ui`.

## Sealed ballot

Mode: `settings.sealedBallot` with `settings.ballotKey` (the public ballot key of the round). It implies hidden counts, and it replaces `vote.add`, `vote.remove` and `vote.toggle` (refused with `forbidden` in this mode, so no choice ever travels in clear).

Keys. The ballot key pair is X25519, derived from the signing seed of whoever opens the round: `HKDF(seed, "", "rb/ballot/v1")` into the 32-byte scalar, then `agreementKeyPair`. For the facilitator link this is the Ed25519 seed of ADR-0029, so any device holding the link re-derives the same key (reload, second device, takeover with `role.claim`). The private key is never stored or sent. No new algorithm: X25519, HKDF, AES-GCM (`sealTo`/`openFrom`) and Ed25519 (the event signature) are the ones already in `packages/crypto`.

Casting. A vote is `vote.seal { sealed }`, with `sealed = sealTo(ballotKey, pad(kind, id), aad)`. The plaintext is a fixed-length record (kind as one letter, id, space padding), so the ciphertext length does not tell a note from a cluster. `aad = "rb/ballot/v1|<room>|<voter signing key>|<ballot key>"` binds the ballot to the room, to its voter and to the round: a copied ciphertext does not open under another voter's key. Replicas also refuse a `sealed` value already present (a replay) and a voter beyond `voteLimit` ballots, using only public data (the number of ballots per voter), so the per-person budget is enforced by every peer and not only by the facilitator. `vote.unseal { sealed }` withdraws one of my own ballots (undo): the voter keeps the sealed value of each ballot it cast, in memory only.

Tally. The facilitator device (the holder of the ballot key) opens every ballot, drops the invalid ones (does not open, wrong aad, unknown or frozen item, not votable, beyond `maxVotesPerItem` for that voter and item, in log order) and counts per item. Nothing but the aggregate leaves that function.

Reveal. `vote.reveal { counts: [{ kind, id, votes }] }` is a facilitator command, signed like every privileged event (Ed25519 over the canonical event, bound to the room). The fold of every replica checks it against the public state before applying it: sealed mode is on, not yet revealed, each item exists and is votable, no item twice, `votes >= 1`, the total is at most the number of ballots cast, and each item's votes are at most what the voters could have put on it (per voter `min(maxVotesPerItem, ballots cast)`). A reveal that fails a check is ignored by everyone, like any invalid event, and a changed byte breaks the signature before the fold. The counts then become anonymous votes on the items (a single placeholder voter), voting closes, and the existing ranking, podium, exports and agent tools work unchanged. A reveal happens once; `vote.reset` clears ballots and the reveal and starts a new round.

What each party learns.
- Participants: who cast how many ballots (the events are signed and the count is public, it is what makes the budget checkable), never for what. Their replica holds only ciphertext; they cannot open another voter's ballot, nor replay it. After the reveal: aggregate counts, no voters.
- Relay: nothing beyond the encrypted envelope it already sees (board events are end-to-end encrypted); no plaintext vote, no ballot key.
- Facilitator device: each ballot's choice together with its (signed) author, in memory, during the tally. The UI never shows who voted for what and the reveal carries no voter. A facilitator who wants to cheat can publish counts that satisfy the public bounds but differ from the ballots: participants verify the bounds and the signature, not each count. The mode is for teams that trust their facilitator not to look, which is the real boundary of "sealed" here, and the setting says so.
- Anyone who holds the ballot key (the facilitator link) can open every ballot of that round.

Facilitator leaves before the reveal. Ballots stay in the log, unreadable and not lost. The link holder tallies on return, from any device, including after a `role.claim`. If the link is gone, the lead cannot read them: it starts a new round (`vote.reset`, then `settings.update` with its own `ballotKey`) and people vote again. Changing `ballotKey` while ballots exist is refused, so a round never mixes two keys.

Limits. One event per vote (free-plan budget unchanged); a ballot is about 135 characters. The reveal is one event whose size grows with the number of voted items, within `maxMessageBytes`.

## Risks / Trade-offs

- [Facilitator offline during sealed ballot] -> ballots queue in the log; the link holder tallies on return. Lost link: start a new round.
- [A dishonest facilitator publishes wrong counts within the public bounds] -> accepted: sealed protects votes from participants and the relay, not from the person who tallies. The setting says so.
- [A voter reloads and loses the sealed values of their ballots] -> undo is unavailable for ballots cast before the reload; votes already cast stay valid.
