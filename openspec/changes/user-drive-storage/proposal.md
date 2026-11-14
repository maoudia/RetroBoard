# Proposal

## Why

Owner feedback 2026-11-03, reworked 2026-11-14: the service stores nothing, so a board lives only in the browsers that opened it, and a user who changes device loses sight of every board they created or joined. The owner wants it to work the way Joplin syncs: a "Sync with ..." option; the app writes only encrypted files to a place the user already has (an Outlook/OneDrive account, a Drive, Dropbox or iCloud folder, GitHub, a WebDAV or S3 server, anything that stores and serves files), and that place is a dumb file store that sees opaque objects. Boards, preferences and the rest of the user's own data are covered, and a new device with the password sees every board again. The product keeps its rules: no storage on our side, nothing readable leaves the browser, strict CSP.

This is a sync feature, not an export feature. Encryption is mandatory and is not a setting: there is no unencrypted or readable mode, no "encryption off" switch, and nothing readable ever reaches a target. `export-hub` and `export-destinations-v2` stay separate and are not touched by this change.

## What Changes

- A **Preferences > Sync** option: the user picks a folder (File System Access API directory picker), creates a vault password and a recovery key, accepts that losing both makes the synced data unreadable, and then boards, preferences and the rest of the user's data sync automatically in the background as encrypted files in that folder (debounced writes, pull on open, focus and a timer). Whatever sync client the user already runs on the folder (OneDrive, Google Drive, Dropbox, iCloud, Syncthing, Nextcloud) carries the files to the cloud: no sign-in, no app registration, no CSP change, no third-party origin. This is Joplin's "File system" target. On a new device the same option makes the library appear and boards open.
- A `SyncTarget` port (plain file API: list a prefix, get, put with an optional `If-Match`, delete, stat) with adapters implemented one by one: the browser storage (default, today's behaviour), then the local folder (the zero-setup "it is just files" path), then the direct-API adapters for phones and browsers without the folder API: OneDrive (Microsoft Graph, app folder) first, then GitHub, Google Drive, Dropbox, WebDAV, S3-compatible and a generic HTTP file store. A shared contract test suite and an in-memory fake target gate every adapter; the fake also proves that no plaintext ever reaches a target.
- A vault on the target (Joplin-style, ADR-0039): `info.json` with wrapped master keys, immutable encrypted objects, the board ledger as per-device segment files and per-board checkpoints (snapshots) merged by union, preferences and the other user data last-write-wins per key with hybrid timestamps. Master key wrapped by a password (Argon2id), printable recovery key, device pairing by QR.
- A per-user board library: an encrypted catalog of every board the user created or saved after joining (id, title, team, last activity, role, key reference), synced like any other stream, with open, archive and forget per board. A new device shows the library and opens a board by fetching its events lazily. The library exists from the first group, before any remote target.
- End users never register anything. For OneDrive (group 3) the Microsoft Entra app registration is a one-time project-level step by the maintainer, as Joplin ships its own registered app; the user presses "Sign in with Microsoft" with their Outlook, Hotmail or work account and the app syncs files in its own OneDrive app folder. R2 needs no registration at all.
- Opt-in per provider with no static CSP origin: each network adapter (group 3 and later) runs in a worker whose own script response carries the CSP for that provider only (ADR-0039). The folder adapter needs no origin.
- Status, last sync, errors, and "disconnect and forget". Every user-owned datum has an explicit sync or skip decision (`design.md`, "What syncs").

## Size, staging and cuts

The owner's staging (2026-11-14): the first adapter is the local folder. Stage 1 is two pull requests in R2: group 1 (the interface, the fake target and contract suite, the object format and keys, the browser adapter with local encryption, the board library) and group 2 (the vault engine with the merge rules, the folder adapter, Preferences > Sync with status and disconnect). Groups 3 to 10 follow in R3, one adapter or surface per group, OneDrive first (it is what phones and browsers without the folder API need).

Honest size: about 14 agent sessions of two hours for stage 1 (about 6 for group 1, 8 for group 2), of which the vault engine and its two-device tests are roughly half. There is no Microsoft registration, no OAuth and no CSP work in R2, which is what keeps it smaller than the earlier OneDrive-first plan (about 16 sessions plus the owner's Entra step). The cost of choosing the folder first is reach: only desktop Chromium users (Chrome, Edge, Opera, Brave) can sync in R2; Safari, Firefox, iOS and Android browsers keep today's behaviour (data in the browser) until group 3.

Cuts I recommend, in this order, if stage 1 proves too big, each leaving a coherent product:

1. Boards the user only joined as a participant: a library entry with the link, no event mirror (reopening joins live and history comes from peers through the relay).
2. Workspace field-level merge: the team workspace syncs as one document, newest wins, with the documented loss when two devices edit it offline.
3. Compaction and checkpoints: segments only grow; a later PR adds them (a new device then reads more segments, still correct).
4. Preferences and library first, boards' events in a follow-up PR of group 2.
5. Device pairing, the printable recovery page and "Stay unlocked on this device" (already in group 10).

What the sync does not give: background sync with no tab open, a vault shared between several users, live co-editing through the target (the relay stays the live path), recovery of a lost password.

## Capabilities

### New Capabilities

- `user-storage`: Preferences > Sync, the board library, change of device, status, disconnect.
- `storage-vault`: mandatory client-side encryption, the object format, keys, layout, merge and failure behaviour on any target.
- `storage-providers`: what each adapter must do, the CSP path, what the target can see.

### Modified Capabilities

<!-- none: the CSP and privacy requirements gain scenarios in the new capabilities above, nothing existing is rewritten -->

## Impact

- Bounded contexts: Board session (replica, ledger), Profile and Team (settings, workspace, recents become the library), Sharing (links keep their keys).
- Code: `packages/application` (port, use cases), `packages/crypto` (object format, Argon2id, recovery key), `packages/sync` (vault merge), `packages/testkit` (fake target, contract suite), `apps/web` adapters, stores, `/boards` and settings UI, `apps/relay/src/core/headers.ts` (worker CSP), docs, ADR-0039.
- Relay and free-plan budget: no relay message, no storage call. One Worker request per load of a provider worker script, only for users who connect that provider.
- Out of scope: export or backup files and readable (Markdown) copies, which are the export features' business; any storage of ours; a managed sync service; sharing a vault between users; background sync with no tab open; re-encrypting history after a password leak (documented limit); syncing drafts; mobile apps.
- Needs the owner: nothing for R2 beyond a live check with a folder carried by their own sync client. For group 3, the Entra app registration (step list in `design.md`); later the Dropbox, Google and GitHub registrations.
- Browser limits: the File System Access API is Chromium desktop only; Safari, Firefox, iOS and Android browsers get the network adapters from group 3 (OneDrive first) and keep today's behaviour until then.
