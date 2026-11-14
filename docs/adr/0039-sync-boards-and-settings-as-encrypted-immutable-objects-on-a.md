---
status: proposed
date: 2026-11-14
decision-makers: Moncef Aoudia
---

# Sync boards and settings as encrypted immutable objects on a user-chosen file target

## Context and Problem Statement

The service stores nothing (ADR-0020), so the browser holds the only durable copy of a board, and a user who changes device loses sight of every board they created or joined. The owner wants boards and preferences kept on storage the user already has (OneDrive, a Drive/Dropbox/iCloud folder, GitHub, WebDAV, S3 and anything else that stores and serves files), modelled on Joplin's sync: the app writes only encrypted items, the target is a dumb file store. Constraints stay: no storage on our side, nothing readable leaves the browser, strict CSP (ADR-0033), AES-GCM boards keyed from the link (ADR-0004, ADR-0029). Change: `user-drive-storage`.

## Decision Drivers

* The target must be replaceable by any file store: a plain file API (list, get, put, delete, stat) and nothing more.
* Two devices work offline and sync later; no coordination service, and lock files only if unavoidable.
* Existing share links, relay protocol and board ledger stay unchanged.
* The page keeps its strict CSP: no origin added for a provider the user never picks.
* The target (and the provider behind it) must learn as little as possible, and an offline guess of the password must be expensive.
* Work in small PRs: the interface and the library first, then one adapter at a time, the local folder first (no sign-in, no origin), OneDrive next.

## Considered Options

* A. Joplin's model as is: one mutable encrypted file per item, `info.json`, lock files for exclusive operations.
* B. Immutable encrypted objects: the append-only event ledger written as per-device immutable segment files, per-device manifests, last-write-wins settings, one small mutable `info.json`; no lock files.
* C. One encrypted blob per board, rewritten on every change (the original draft of this change).
* D. A relay-side or hosted store (rejected by N2).

## Decision Outcome

Chosen option: "B", because the board is already an append-only signed ledger, so merging two copies is a union by event id and needs neither locks nor conflict copies, and every normal write creates a new uniquely named file, which is the one operation every file store does atomically.

### Joplin and this design

Joplin keeps each note as a mutable file whose newest `updated_time` wins (a copy becomes a conflict note) and uses lock files in a `locks/` folder so that a client can run a whole-target operation (a format upgrade, enabling encryption re-uploads every item) exclusively. This design has no operation that rewrites the target: a password change re-wraps the master key in `info.json`, a format upgrade only raises `minReader` while new objects are written under new names, a key rotation is lazy (new objects use the new key id). The only mutable files are `info.json` (small, merged per property by `updatedTime` as in Joplin, written with `If-Match` where the target supports it) and each device's own manifest (one writer). Where Joplin relies on a cooperative lock, we rely on immutability and on idempotent union.

### Layout of a vault on a target

| Path | Content | Written by |
| --- | --- | --- |
| `info.json` | plaintext: `version`, `minReader`, `vaultId`, `cipher`, `activeKeyId`, `keys[]` (wrapped master keys, each with KDF parameters and `updatedTime`), `settings` | any device, merged per property |
| `m/<device>.rbm` | sealed manifest of the device's segments (stream, sequence, size, hash) | that device only |
| `s/<stream>/<device>-<seq>-<rand>.rbs` | sealed immutable segment: batch of events, setting changes, or library entries | that device, create-only, never rewritten |

`<stream>` is `HMAC(nameKey, name)` truncated to 128 bits, base32 lowercase (ASCII, no case collision on case-insensitive stores): one stream per board, one for settings, one for the board library. Reading is: list `m/` (one file per device, tiny), fetch the manifests that changed (etag or modified time), fetch only the segments not yet applied, and for a board only when it is opened (lazy). A device compacts only its own segments into a checkpoint segment and deletes the old ones after a grace period, so compaction never races with another writer; a reader that finds a segment gone re-lists. The manifests are an optimisation: the truth is the segments, a missing manifest is rebuilt by listing.

A segment holds the existing encrypted envelopes verbatim (already signed events sealed with the board content key), wrapped once more with a vault stream key. The double layer hides event boundaries from the target, keeps a leaked share link from opening the user's vault files, and gives every stream one format. Existing links keep working because the board content key (`HKDF(roomKey, roomId)`) is untouched: the room key and the facilitator secret of a board are stored in its library entry, sealed with the vault key, so a new device can reopen a board it never received a link for.

### Keys

* Master key: 256 random bits per vault. Stream keys, the name key and the library key are `HKDF(master, vaultId, info)`; each object also draws a 128-bit random salt for its own object key, so a nonce can never repeat across objects.
* Objects: plaintext header (magic, format version, cipher id, key id, salt, chunk size), then chunks sealed with AES-GCM (counter nonce, header hash and a "final chunk" flag in the associated data, so truncation and reordering are detected). The key id in the header says which master key to use, as in Joplin's header.
* Password: the master key is wrapped by a key derived from the user's password. Recommended KDF: **Argon2id, pure JavaScript from `@noble/hashes` (MIT, already in the lockfile through `@noble/curves`), run in a worker**, parameters stored with each wrap and never below the OWASP floor (19 MiB, 2 passes, 1 lane); the benchmark in task 1.4 picks the default (target 64 MiB or 32 MiB, 3 passes, at most 1.5 s on a desktop and 4 s on a mid-range phone). PBKDF2-HMAC-SHA-256 with 600,000 iterations (already in `packages/crypto`) stays a registered fallback id. Why not WebCrypto only: PBKDF2 is cheap on GPUs, and here the wrapped key sits on a third party's disk, so a memory-hard KDF matters more than for a room passcode. Why not a wasm Argon2: it needs `'wasm-unsafe-eval'` in `script-src`, which loosens the strict CSP for every page; the CSP hashes pipeline (`scripts/csp-hashes.mjs`) hashes inline scripts and styles and cannot express it. Pure JS costs speed, not a policy change. Password length is at least 12 characters with a local strength hint.
* Recovery key: the same master key wrapped a second time with a 160-bit random key printed as base32 groups with a check digit and a QR code. Password change adds the new wrap and removes the old one in `info.json`; nothing else is re-encrypted.
* Honest limits: a password change does not revoke a copy of the target that someone already holds together with the old password (real revocation means a new master key and re-encrypting history, an explicit later action). **If the password and the recovery key are both lost, the target's content is unrecoverable**, for us as for everyone. A device that is still unlocked keeps its local copy and can create a new vault from it.
* Local at rest: the IndexedDB cache seals objects with a non-extractable device key (as `adapters/device-key.ts`); the vault master key appears only after the user connects a target.

### What a target can see

Object count and sizes (padded to a power of two, 1 KiB minimum, so tiny segments look alike), write and read times, the number of devices (device ids appear in file names) and their activity rhythm, the number of boards (stream names are keyed hashes, unlinkable to room ids and across vaults), key ids, KDF salt and parameters, the format version, and the account behind the provider. It can delete, withhold or roll back objects (availability), but it cannot read or alter content: every object is authenticated and bound to its path class and stream, and events are signed. Anti-rollback: a device remembers the highest `updatedTime` it has seen per `info.json` property and refuses to go back.

### Failure modes

| Case | Behaviour |
| --- | --- |
| Partial write | stores write a file atomically (File System Access swaps on close, S3, Graph, Drive and Dropbox are atomic; WebDAV writes to `tmp/` then `MOVE`). A truncated segment fails its final-chunk check and is ignored until the manifest and the size agree. |
| Two devices offline | segments from both are unioned by event id; settings by hybrid timestamp then device id; `info.json` per property. |
| Clock skew | hybrid clock (`packages/sync/src/clock.ts`); a remote stamp is clamped to the receive time plus `MAX_DRIFT_MS` for ordering, and a local edit always ticks above the stamp it replaces. |
| Target full | sync pauses with a visible state, the local copy is untouched, nothing is deleted to make room. |
| Target deleted or replaced | `vaultId` mismatch: the user is asked; the vault is never silently recreated. |
| Concurrent tabs | one sync leader per vault through `navigator.locks`. |

### Providers, tokens, and the CSP

Providers are adapters behind one `SyncTarget` port (list prefix, get, put with `ifMatch` or `absent`, delete, stat, plus a capability record: conditional writes, listing with modified time). A contract suite in `packages/testkit` runs against every adapter, so adding one is writing the adapter and passing the suite. Order: browser storage, local folder (Joplin's "File system" target: the user picks a folder and the sync client they already run carries it to the cloud), OneDrive, GitHub, Google Drive, Dropbox, WebDAV, S3, generic HTTP. Folder and IndexedDB need no origin. OAuth providers use app-folder scopes only (`Files.ReadWrite.AppFolder`, `drive.appdata`, Dropbox "App folder"), so a stolen token reaches the ciphertext of this app and nothing else; the app registrations are one-time project-level steps by the maintainer and end users only press "Sign in". Tokens never leave the browser: they are sealed with the device key in IndexedDB.

CSP path (the exception for ADR-0033's rule, per provider and only after the user opts in): the page CSP is not changed. Each network adapter runs in a dedicated Web Worker served from a fixed, un-hashed URL `/sync/<provider>.js`, and the Worker adds a `Content-Security-Policy` header to that script only (`default-src 'none'; connect-src <provider origins>`). A dedicated worker takes the CSP of its own script response, not of the page, so the origins apply inside the worker only, and a user who never picks the provider never loads the script (`worker-src` falls back to `script-src 'self'`, which already allows it). The worker handles ciphertext, tokens and credentials, never a key or plaintext. Origins: OneDrive `login.microsoftonline.com` and `graph.microsoft.com`, plus the hosts of resumable upload sessions (`api.onedrive.com`, `*.sharepoint.com`, to confirm in task 2.1); Dropbox `api.dropboxapi.com`, `content.dropboxapi.com`; Google `www.googleapis.com` and `oauth2.googleapis.com`; GitHub `api.github.com`; WebDAV, S3 and generic HTTP are user-typed origins and use one `net` worker with `connect-src https:`. Sign-in navigates the whole window to the provider and back to a same-origin `/sync/callback` page (no popup: `Cross-Origin-Opener-Policy: same-origin` severs `window.opener`; navigation is not governed by `connect-src`).

Honest limit: the opt-in is "the script is not loaded", not a wall against XSS. Script injected in the page could start the same-origin worker itself and use its origin, exactly as ADR-0033 admits for `hooks.slack.com`; the defence stays the strict `script-src`. For `https:` in the `net` worker the exposure is wider (any https host) but bounded: credentials are pinned to the origin they were entered for, and no key or plaintext ever enters the worker. This relies on the browser applying the worker's own CSP; task 3.1 (the first network adapter, OneDrive) proves it in Chromium, Firefox and WebKit before anything else is built on it. If a browser fails the test, the fallback is the ADR-0033 pattern: fixed provider origins in the page `connect-src`, for those browsers' users, and no `net` worker.

### Consequences

* Good, because the same union merge as the live board ledger gives offline merges with no lock, no conflict copy and no coordination service, on any store that can put and get a file.
* Good, because the page CSP, the relay and the share links do not change, and a user who never connects a target is unaffected.
* Good, because a provider is one adapter plus a contract suite; the folder first proves the engine, the format and the keys with no network, sign-in or CSP change, and reaches every cloud that has a desktop client.
* Good, because the board library makes a change of device a password away.
* Bad, because sync only runs while a tab is open (no server, no reliable background sync), and a folder is invisible to Safari, Firefox and mobile browsers until the network adapters ship.
* Bad, because a desktop sync client is not under our control: delay, half-synced files, conflict copies. Immutable uniquely named objects, a strict name whitelist and authenticated chunks make each of those harmless; only `info.json` can see a conflict copy, and the engine merges it.
* Bad, because many small files cost listing time; per-device manifests and own-segment compaction bound it, but a heavy user may notice it on WebDAV.
* Bad, because browsers talking to WebDAV and S3 need CORS configured on the user's server, which many servers do not allow out of the box.
* Bad, because the Argon2id in pure JS is slower than native and the OAuth refresh lifetimes (OneDrive 24 hours for a single-page app) force a periodic sign-in.
* Bad, because the opt-in does not protect against XSS (above).

## More Information

OpenSpec change `user-drive-storage` (proposal, design, specs, tasks). Related: ADR-0004, ADR-0020, ADR-0029, ADR-0033, ADR-0034. Joplin specifications: <https://joplinapp.org/help/dev/spec/e2ee/> and <https://joplinapp.org/help/dev/spec/sync/>. Revisit the KDF default after the task 1.4 benchmark and the CSP path after the task 3.1 browser test.
