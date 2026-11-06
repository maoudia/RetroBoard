---
status: accepted
date: 2026-11-06
decision-makers: Moncef Aoudia
---

# Compact board links with 128-bit board keys

## Context and Problem Statement

A board link is about 70 characters for participants and 116 for facilitators, because it spells out two 256-bit keys in base64url (owner feedback, 2026-10-29: links should be short). The key must stay in the URL fragment and nothing may be stored on our side, so a lookup table is not possible; only a smaller key or a tighter syntax can shorten the link. Change: `short-links-and-join`, task 1.3. This refines ADR-0004, which fixed AES-GCM 256 and the key in the fragment.

## Decision Drivers

* The key never leaves the browser and the relay stores nothing (hard rules of the project).
* Links shared before this change must keep opening their board.
* A 128-bit secret is out of reach of brute force; the board is an hours-long retro, not an archive.

## Considered Options

* Keep 256-bit keys and only drop the `r=`, `k=` and `&` syntax (saves about 6 characters)
* 128-bit secrets and a positional syntax
* A short id resolved by the relay (needs storage and shows the relay which board it is)

## Decision Outcome

Chosen option: "128-bit secrets and a positional syntax", because it is the only option that makes the link markedly shorter (48 characters for participants, 69 for facilitators) without any server state.

* The room key and the facilitator secret of a new board are 16 random bytes (22 characters). The content key is still `HKDF(roomKey, roomId, "rb/content/v1")` into a 256-bit AES-GCM key, so the cipher is unchanged and its strength is that of the 128-bit secret. The facilitator signing seed is `HKDF(secret, "", "rb/facilitator/v1")` into the 32 bytes Ed25519 needs; the facilitator public key in the genesis event is still 32 bytes.
* The compact link is `#c=<22 chars room id><22 chars key>` for participants and the same followed by `<22 chars secret>` for facilitators, with the existing `&p=1` for a passcode. The length of the value tells the role. Mixing `c` with `r`, `k` or `f` is refused.
* The previous syntax (`r=`, `k=`, `f=` with 256-bit values, and a bare legacy room id) is still parsed and still produced for boards that already exist, whose keys cannot be shortened. Their links do not change.
* Older clients refuse a compact link as an invalid link (unknown field), they never misread it.

### Consequences

* Good, because new links are 30 to 40 percent shorter and fit a QR code at a smaller version, without storage or a lookup.
* Good, because old links, recent boards and board files keep working.
* Bad, because new boards carry 128 bits of secret instead of 256. Guessing a key is still infeasible, but the margin against a future quantum adversary (Grover, about 64 bits of work) is smaller than before. A board that needs the larger margin can use a passcode, which is stretched with PBKDF2 and mixed into the content key.
* Bad, because two link syntaxes live side by side as long as old boards exist.

## More Information

* Supplements ADR-0004 (key in the link, AES-GCM 256); ADR-0004 stays accepted.
