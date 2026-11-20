# Design

Source of the mobile findings: the scout report of 2026-11-20, kept in this change as [mobile-sync-report.md](mobile-sync-report.md). Items marked **[verify on device]** are the report's unproven iOS and Android claims and each becomes a recorded check in group 6.

## Where each piece lives

| Piece | Layer | Notes |
|---|---|---|
| Shield button, sheet, nudge | `apps/web` (components, `stores/vault.ts`, `stores/ui.ts`) | State comes from the existing `VaultStatus`; no new engine state except `stayUnlocked` (group 6). |
| Capability detection for the chooser | `apps/web/app/adapters/sync/` | Feature tests only (`showDirectoryPicker`, `navigator.share`, `canShare({ files })`, `BarcodeDetector`), never the user agent, as in `user-drive-storage` 2.5. |
| `.rbv` writer and reader | `packages/sync` (format and union import) and `apps/web` (share sheet, file input) | Reuses the sealed objects of ADR-0039: no new cipher and no readable byte. |
| Pairing exchange | `packages/crypto` (PAKE), `packages/application` (use case), `apps/web` (screen), `packages/protocol` only if the spike says so | Group 5. |
| Icon | `apps/web` local icon | A shield with two arrows drawn on the lucide grid and stroke, bundled (no remote icon). The sync shield must not be mistaken for the board's encryption badge: that one is a plain shield, this one carries the arrows and a different colour role. |

## 1. The shield button

States and icons (one shape per state, colour never the only cue, as `sync-status.ts` already does):

| Status | Shield | Press does |
|---|---|---|
| not set up | outline, muted | opens the onboarding sheet |
| locked | shield with a lock | opens the unlock prompt |
| synced | shield with a check | syncs now and confirms |
| syncing | shield with turning arrows | nothing (already syncing) |
| offline, needs attention, target full, allow folder, folder not found, sign in again | shield with an alert mark | does the one recovery action (allow access, choose again, sign in), otherwise opens the status panel |

The button has an accessible name made of the state in words ("Sync: synced 12:03"), a tooltip, a polite live region message after a press, and a 44 px target on touch. It sits at the start of the toolbar next to `EncryptionBadge`; on a phone, where the toolbar scrolls and hides (`mobile-board-space`), it is among the items that stay.

Press is the single action "sync now". Everything else (status details, disconnect, recovery key, devices) is in Preferences > Sync, reachable from the confirmation message ("Settings") and from the button's context menu. A context menu on right click or long press is an addition, never the only path (WCAG 2.5.1).

## 2. Any folder

What the app does and does not do with the chosen folder:

- It writes `RetroBoard/` inside the picked folder (the layout of ADR-0039) and nothing else. No path, provider or sync-client name is parsed or special-cased.
- The browser's picker refuses some directories (it refuses the roots of well-known system folders in Chromium) **[verify on device]**: the refusal is caught as an abort or a security error and the message proposes making a subfolder first, with the folder name suggested.
- Moving the folder: "Choose another folder" re-points the vault. If the new folder holds the same vault id the engine continues; if it is empty it asks whether to copy the vault there; if it holds a different vault it asks "Use this vault" or "Create a new one here" and never merges two vaults silently.
- The user's own sync client is the user's responsibility. The onboarding and the guide say so in one sentence and link to the chapter that lists what was tested (OneDrive, Dropbox, Google Drive, iCloud Drive, Syncthing, Nextcloud) without promising any of them.

## 3. The sheet and the nudge

Three sentences, no jargon: "Your boards stay on this device. To keep them on your other devices, RetroBoard saves an encrypted copy that only you can open. There is no account: you choose where the copy lives." Then the available paths as large, equal-weight choices with a one-line reason each; a path this device cannot do is not shown (not greyed), and a "Why not a cloud account?" link explains the product position in two lines.

Order of the choices is computed, not fixed: a desktop Chromium browser leads with "A folder on this computer"; any device with another device at hand leads with "Another device of mine"; a phone leads with "Another device of mine", then "A file I save myself". The nudge appears once, after the first board is created, as a dismissible line under the board title area, never as a dialog, never during a running phase, and "Not now" is remembered per device (a per-viewer convenience).

## 4. The sealed vault file

`.rbv`: a header (magic, version, vault id, object count, final-chunk marker) and the vault's sealed objects concatenated with a length index. It contains exactly what a folder target would contain, so import is a `put` of each object into the local target followed by the normal union; there is no new merge logic. A password (or the recovery key) is still needed to read it; the file is useless without it, which is why it can be mailed or put in iCloud Drive.

- Export: `navigator.share({ files })` when `canShare({ files })` is true, a download otherwise **[verify on device]** (older Safari). Size limit and a clear message when the vault is too large for a share sheet.
- Import: `<input type="file">` (the Share Target API does not exist on iOS Safari); import into a device that has no vault asks for the password and creates the local copy.
- "Last backup" line in Preferences > Sync and in the status of the shield (never red; it is a hint).
- One format shared with `local-data-durability` task 2.2 and `export-destinations-v2` ("Backup"): those two reuse this writer instead of defining another.

## 5. Pairing without a platform

Replaces the pairing of `user-drive-storage` group 10 ("QR with ten words sealing a blob"). The three changes, from the report:

1. Move the vault key and a target descriptor, not credentials: the second device signs in to its own provider if there is one.
2. Use a PAKE (CPace or SPAKE2) so the relay and anyone watching learn nothing guessable offline and a wrong guess costs one attempt. Short secret shown as a QR and as words to type, expires after 2 minutes, one attempt per code.
3. Optional data path over the same channel (WebRTC data channel with relay fallback, as the board mesh does): the two devices exchange manifests and send the missing sealed segments both ways, so no cloud account is needed at all. Works only while both devices are open on the pairing screen.

The relay stays memory-only and sees ciphertext and sizes only. **Open question for the spike (task 5.1):** whether the room protocol accepts a rendezvous unchanged (envelope validation, `maxConnections`, the `sig` budget of 120 frames); if a frame type is needed it is a protocol change with its spec and an ADR note, because `user-drive-storage` promised "no change to the relay or the protocol". Crypto: a vetted implementation or the noble primitives with published test vectors, and an independent review before release.

## 6. Phones

- PKCE state of the OneDrive sign-in moves from `sessionStorage` to a sealed IndexedDB entry with a short expiry, so an app switch or an installed app returning through Safari does not lose it **[verify on device]**.
- "Stay unlocked on this device" (design question 6 of `user-drive-storage`): opt-in, a non-extractable key in IndexedDB, off switch, default decided by the owner (the report recommends on for phones with the stated trade-off: script running in the page could use the key).
- The browser matrix text replaces "OneDrive adapter later" with the real options per browser.
- iOS: no background sync exists; sync runs while a tab is open, as ADR-0039 already says. An installed home-screen app and Safari do not share storage; the sheet says so when it detects a standalone display.

## Security and privacy note

What a target sees is unchanged: opaque sealed objects, names derived by HMAC, sizes padded to powers of two. The `.rbv` file is the same sealed objects. The pairing exchange gives the relay ciphertext, sizes and timing, never a key (the PAKE output never leaves the two devices). The shield button and the nudge store only a per-device "dismissed" flag. No analytics, no cookie, no third-party origin; the strict CSP is unchanged because no new origin is contacted by groups 1 to 4 and 6 (OneDrive keeps its own worker CSP).

## Decisions that need the owner

- Group 3: is the shield shown to everyone, including people who never opened sync? (This design says yes: discovery is the problem.)
- Group 6: "Stay unlocked" default on or off on phones.
- Group 5: accept a rendezvous frame in the protocol if the spike shows it is needed.
- Registering the Microsoft app, and testing on real iOS and Android devices.
