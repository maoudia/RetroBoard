---
status: proposed
date: 2026-11-20
decision-makers: Moncef Aoudia
---

# Sync without a platform: the sealed vault file and device pairing

## Context and Problem Statement

ADR-0039 syncs boards and settings as encrypted objects on a target the user chooses. Its first adapter is a local folder, which exists only in desktop Chromium, and its first network adapter is OneDrive, which is hidden until the maintainer registers an app and which on phones has a daily sign-in (the refresh token dies 24 hours after sign-in), covers personal accounts only and has an unproven iOS redirect behaviour. iCloud and Google have no usable browser API under the strict CSP, and iOS has no background sync. The owner wants a key feature that needs no account, works for non-expert users and phones, and depends on no platform. See the change `sync-ux` and its scout report `mobile-sync-report.md`.

## Decision Drivers

* No account, no storage on our side, nothing readable leaves the browser (hard rules)
* Works on phones and in browsers with no folder picker, without depending on one vendor
* One sealed format, not one backup format per feature
* The relay stays memory-only and sees ciphertext only

## Considered Options

* Add more cloud adapters first (Dropbox, WebDAV, GitHub, Google Drive)
* the sealed vault file plus device pairing (a `.rbv` file through the share sheet and a file input, and pairing through the relay with a password-authenticated key exchange)
* A service of ours that relays or stores vaults

## Decision Outcome

Chosen option: "the sealed vault file plus device pairing", because both work on every browser and platform, need no account and no third-party origin, and reuse the sealed objects of ADR-0039 so no merge rule and no readable byte is added. Network adapters follow by their value on a phone (Dropbox before WebDAV before GitHub), and Google Drive only after a go or no-go spike, because it may need a secret on a server of ours, which this project refuses.

Details fixed by this decision:

* The `.rbv` file holds exactly the sealed objects a folder target would hold; import is a put plus the normal union. It is the single format for every backup or board-file feature (`local-data-durability`, `export-destinations-v2`).
* Pairing replaces the "ten words sealing a blob" design of `user-drive-storage` group 10: a PAKE (CPace or SPAKE2) over the relay, two-minute expiry, one attempt, the vault key and a target description moved but never provider credentials, and an optional device-to-device exchange of the missing segments.
* If the room protocol cannot carry the rendezvous unchanged, the protocol change is specified and recorded before code (`sync-ux` task 5.1).

### Consequences

* Good, because a person with a laptop and a phone needs no account, no folder and no platform
* Good, because the file doubles as the safety net against storage eviction on iOS
* Bad, because the file route is manual and the pairing syncs only while both devices are open
* Bad, because a PAKE is new cryptographic code: audited implementations and published test vectors only, plus an independent review before release

## More Information

Supplements ADR-0039 (not rewritten). Revisit when a browser ships a usable folder or file-system sync API on phones, or when the PAKE spike shows the protocol must change.
