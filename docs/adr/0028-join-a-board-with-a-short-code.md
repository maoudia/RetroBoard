---
status: accepted
date: 2026-11-02
decision-makers: Moncef Aoudia
---

# Join a board with a short code

## Context and Problem Statement

Pasting a long link is impractical (owner feedback, 2026-11-02). The board key lives in the link fragment and must never reach the relay, so a short code cannot name the board by itself. How can someone join by typing a short code without any server storage and without the relay learning the key? Change: `short-links-and-join`.

## Decision Drivers

* The relay sees at most ciphertext and ids; no storage; no new relay frames if avoidable.
* Works for any participant who holds the board, not only a facilitator.
* A 6-character code is weak: assume a relay or a guesser can try codes.

## Considered Options

* A code-to-room lookup table on the relay (needs storage and reveals the room)
* A longer code that carries the key (not short)
* A side room derived from the code where the holder and the joiner meet, with the link sealed to the joiner's one-time key

## Decision Outcome

Chosen option: "A side room derived from the code", because it needs no relay change and no storage.

* The code is `RB-` plus 6 characters from a 32-letter alphabet without look-alikes, valid 10 minutes, made by a holder who keeps the tab open.
* The side room id is `base64url(SHA-256("rb-join-room|" + code))` cut to 22 characters; messages are the usual envelopes sealed with `HKDF(code)`. The relay forwards them as live (`eph`) frames and cannot read them.
* The joiner sends a knock with a one-time X25519 public key; the holder sees the name and a safety number (6 digits from the key) and lets the knocker in or refuses; the board link is sealed to the joiner's key (`sealTo`), so only that key opens it.
* Threat model: the relay can guess a 30-bit code offline and could swap the joiner's key. The safety number, read aloud and compared by the human holder before accepting, exposes a swap. A wrong or expired code never reaches anyone.
* The link of a passcode-protected board still needs its passcode, which travels another way.

### Consequences

* Good, because no relay change, no storage, and the key never leaves the participants.
* Bad, because someone who holds the board must be online with the code shown; otherwise the screen offers the link instead.

## More Information

* Presenter-screen display of the code and room-words help text remain open tasks of the change.
