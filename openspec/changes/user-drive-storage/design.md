# Design

The decision record is [ADR-0039](../../../docs/adr/0039-sync-boards-and-settings-as-encrypted-immutable-objects-on-a.md) (layout, keys, KDF, CSP path, what the target sees, failure modes). This file says where each piece lives, what groups 1 and 2 touch, how it looks to the user, how the folder adapter behaves, and what the owner must do later for OneDrive.

The first adapter is the **local folder**, exactly Joplin's "File system" target: in Preferences > Sync the user picks a folder, the app writes its encrypted files there, and whatever sync client the user already runs on that folder (OneDrive, Google Drive, Dropbox, iCloud, Syncthing, Nextcloud) carries them to the cloud. No sign-in, no app registration, no CSP change, no third-party origin. The direct-API adapters (OneDrive through Microsoft Graph first, for phones and browsers without the folder API) come later.

## Vocabulary

- **Target**: where the files go (a folder, OneDrive app folder, GitHub, ...). A dumb file store.
- **Vault**: the set of objects of one user on one target: `info.json`, manifests, segments, checkpoints.
- **Stream**: a named sequence of segments inside a vault: one per board, one `settings`, one `workspace`, one `library`.
- **Library**: the user's catalog of boards (stream `library`).

## Where each type lives

| Piece | Layer | Location |
|---|---|---|
| `SyncTargetPort`, `TargetCapabilities`, `TargetError`, `ObjectInfo` | application port | `packages/application/src/ports/sync-target.ts` (exported from `ports/index.ts`) |
| Use cases: `createVault`, `unlockVault`, `syncVault`, `openLibraryBoard`, `saveBoardToLibrary`, `archiveBoard`, `forgetBoard`, `disconnectAndForget` | application | `packages/application/src/storage/` |
| Library entry and merge, settings lists, `mergeWorkspace` | application (pure) | `packages/application/src/storage/library.ts`, `settings-sync.ts`, `workspace-merge.ts` |
| Vault merge: `info.json` per-property merge, segments, manifests, checkpoints, compaction, last-write-wins, anti-rollback | sync (pure, no I/O) | `packages/sync/src/vault/` |
| Object format (header, chunks, padding), key schedule, Argon2id wrap, recovery key | crypto | `packages/crypto/src/vault.ts`, `kdf.ts`, `recovery.ts` |
| In-memory fake target with the plaintext guard, fake directory handle, adapter contract suite, (later) fake Graph | testkit | `packages/testkit/src/sync-target.ts`, `contract.ts`, `fake-directory.ts` |
| Adapters | adapters (app) | `apps/web/app/adapters/sync/` (`idb-target.ts`, `folder-target.ts`, `folder-handle.ts`; later `onedrive-*.ts`, `workers/`, `oauth-pkce.ts`, `token-store.ts`) |
| Library store, vault store (status, lock state), UI | app | `apps/web/app/stores/library.ts`, `stores/vault.ts`, `components/SyncSettings.vue` (a section of the preferences dialog `ProfileDialog.vue`), `LibraryList.vue`, `pages/boards.vue` |
| Worker CSP table for `/sync/*.js`, callback route (group 3 only) | relay core | `apps/relay/src/core/headers.ts`, `apps/relay/src/errors.ts` |

The domain package is untouched: board events, signatures and the ledger do not change. Ports involved: `SyncTargetPort` (new), `ReplicaStorePort` (existing, receives events restored from a target), `LocalSealer` (existing, `adapters/device-key.ts`).

## Interface (port)

```ts
type ObjectPath = string  // lowercase ASCII [a-z0-9._-] segments joined by "/", at most 90 chars, at most 3 levels
interface ObjectInfo { path: ObjectPath; size: number; etag: string; modifiedAt?: number }
interface TargetCapabilities {
  conditionalPut: 'etag' | 'none'  // put honours ifMatch and 'absent'
  atomicPut: boolean               // a reader never sees half a file
  listsModifiedTime: boolean
  maxObjectBytes: number           // the engine splits segments below it
}
interface SyncTargetPort {
  readonly kind: 'idb' | 'folder' | 'onedrive' | 'github' | 'gdrive' | 'dropbox' | 'webdav' | 's3' | 'http'
  readonly capabilities: TargetCapabilities
  list(prefix: ObjectPath, signal?: AbortSignal): AsyncIterable<ObjectInfo>
  get(path: ObjectPath, signal?: AbortSignal): Promise<{ bytes: Uint8Array; etag: string } | null>
  put(path: ObjectPath, bytes: Uint8Array, opts?: { ifMatch?: string | 'absent' }): Promise<{ etag: string }>
  delete(path: ObjectPath): Promise<void>
  stat(path: ObjectPath): Promise<ObjectInfo | null>
}
```

Errors are one `TargetError` with a `code`: `precondition-failed`, `not-found`, `auth-expired`, `permission-needed` (folder access to re-grant), `forbidden`, `throttled` (with `retryAfterMs`), `target-full`, `unreachable`, `too-large`, `unsupported`. Adapters map every provider error to one of them; the engine decides (retry, pause, ask the user). The port moves bytes only: sealing and unsealing happen above it, so an adapter never holds a key.

### Adapter contract suite

`runSyncTargetContract(name, makeTarget)` in `packages/testkit` is a vitest suite every adapter file calls. It checks: put then get round trip (0 bytes, 1 byte, 5 MiB); `absent` fails on an existing path and succeeds on a free one; `ifMatch` with a stale etag fails and with the current one succeeds (skipped, and asserted skipped, when `conditionalPut` is `'none'`, which also skips the create-only check: the folder adapter achieves create-only by its own means and the engine never relies on it); `get` and `stat` of a missing path give `null`; `list` returns only the prefix, with sizes and etags, across more than one provider page (1,200 objects); `delete` is idempotent; names are lowercase ASCII and two names differing by case cannot coexist; error mapping (permission revoked, expired token, full quota, offline fetch give the matching `code`; a harness lists the faults it can provoke, a local store has no token to expire). The in-memory fake runs it in CI with no browser; the folder adapter runs it against the fake directory handle (and once in real Chromium on the origin private file system); each later adapter adds its run against a provider fake.

## Encryption is mandatory

There is no unencrypted mode and no switch: `SyncTargetPort` receives bytes that the vault layer has already sealed, `info.json` is the only plaintext object and holds no user data (format version, ids, KDF parameters, wrapped keys), and sync cannot start without a vault password (create flow below). The guard that keeps it true is a test, not a convention: `createMemoryTarget()` in `packages/testkit` records every path and every byte array it is given and exposes `assertNoPlaintext(canaries)`. The engine tests and the e2e tests seed a board, a library, the settings, the workspace and the identity with distinctive titles, notes, names, team names and setting values (`CANARY-title-7f3a`, ...) and assert that none of them, in UTF-8, UTF-16, base64 or percent-encoded form, occurs in any path or in any stored object, `info.json` included. The folder adapter's e2e test reads the real folder and runs the same assertion; later adapters run it on the HTTP bodies and URLs they send.

## What syncs

Every user-owned datum found in the code today, with its decision. The lists `SYNCED_SETTINGS` and `LOCAL_ONLY_SETTINGS` (and equivalents for the other stores) make the rule testable: a unit test fails when a setting or store key is in neither.

| Datum (where it lives now) | Decision | Why |
|---|---|---|
| Boards: the ledger envelopes in `retroboard-replica` | **Sync**, stream per board, segments plus checkpoints, lazy | the point of the feature |
| Saved boards list (`stores/recents.ts`, `retroboard:recents`) | **Sync** as the library | becomes the library; recents is a view of it |
| Solo marks (`utils/solo.ts`, `retroboard:solo`) | **Sync** as `solo` on the library entry | a solo board must never reach the real relay by accident, on any device |
| Preferences about the person (`LocalSettings`): `locale`, `variant`, `defaultTheme`, `avatarHue`, `uiMode`, `motion`, `sound`, `ambient`, `presentGroups`, `shortcuts`, `keyHints`, `shareCursor`, `showCursors`, `notifyPos`, `phaseWarning`, `presenterHideMenus`, `stepperTime`, `ringTime`, `chatStatus`, `votedSort`, `saveJoinedBoards` | **Sync**, last-write-wins per key | follow the person |
| Preferences about the device: `density` (screen), `chatSide` (layout), `retentionDays` (this device's storage), `systemNotify` and `browserAgents` (browser permission and consent), `p2p` (network), `slackWebhook` (secret, ADR-0033) | **Skip** | differ per device or are secrets |
| Identity (`stores/identity.ts`): `name`, `showName`, `named`, `nudgeOff` | **Sync** | the person's display choices |
| Identity `cid` | **Skip** | per-device participant id; two devices sharing one would look like one participant in presence |
| Profile and avatar | **Sync** with settings (`avatarHue`) | the avatar is a hue and initials today; an uploaded image (`profile-avatars-and-team-space`, R3) will be a chunked object of the settings stream, so the format already fits |
| Team workspaces (`stores/team.ts`, `retroboard:workspace`): teams, projects, saved retro actions, owners | **Sync** as stream `workspace`, merged by `mergeWorkspace` (teams by id last-write-wins, saved retros by board id union, owners union) | the user's teams and their carried-over actions |
| Actions carried over | **Sync** through two places, no new datum: the saved retros of the workspace and the ledgers of the boards | the library makes the source boards reachable |
| Themes | **Sync** only the choice (`defaultTheme`, `variant`) | themes are built in, there are no custom themes; the board theme lives in the board's ledger |
| Drafts and composer text (`retroboard:drafts:`, `retroboard:compose:`) | **Skip** | ephemeral, sealed locally (`local-data-durability`) |
| Passcodes (`retroboard-vault`, `retroboard:pass:`) | **Skip**; the library stores only `hasPasscode` | secrets of one device |
| Folder handle, tokens, credentials, vault key cache of this feature | **Skip, never synced** | per device by design |
| Companion agent configuration (`retroboard-agents-v*`) and RAG index (`retroboard-rag-v*`) | **Skip** | device capability, rebuildable, large |
| Layout and positions (`retroboard:layout`, `retroboard:chat-bubble`) | **Skip** | screen-specific |
| Per-room UI flags (`retroboard:init:`, `review:`, `removed:`, `closed:`, `nudge:`) | **Skip** | ephemeral interface state |
| Replica journal and retention bookkeeping (`rep:`, `rep-wal:`, `rep-used:`), snapshot tuning, `clone`, session signing key, device key | **Skip** | device-local machinery |
| Team share links and files (`#team=`, `.retroteam`) | **Skip** | transient; a manual way to move a team that stays available |

Anything new the stores gain must be classified; the test enforces it.

## Vault engine (packages/sync, group 2)

`syncVault(target, vault, local)` is one pass; the app calls it on open of the app, on `visibilitychange` to visible and hidden, on window focus and `online`, after local writes (debounced 5 s), on a timer (every 60 s while visible, 30 s on an open board), and on "Sync now". There is no push from any target, so pull is always one of these triggers.

1. Read `info.json` (`stat` first: unchanged etag or size and modified time means skip). Merge properties by `updatedTime`; refuse if `minReader` is above this build; refuse a lower `updatedTime` than the highest this device has seen (rollback).
2. List `m/` (one file per device). Fetch the manifests that changed. Compute the segments not yet applied.
3. For the `library`, `settings` and `workspace` streams, fetch and apply the new segments. For a board stream, fetch only if the board is open or flagged "keep offline" (lazy): a new device downloads a board's events when the user opens it, starting from the latest checkpoint.
4. Upload: collect local envelopes and changes not yet in the target per stream, seal them into one segment (padded), `put` with `absent` where supported (the name carries a random suffix, so a lost response never overwrites), then rewrite this device's manifest.
5. Checkpoints and compaction (this device's own segments only, when above 20 segments in a stream or 4 MiB, and when a board is closed after a retro): write a checkpoint (the per-board encrypted snapshot a new device downloads first, then only the segments after it), update the manifest, delete the old segments after 24 hours and keep the previous checkpoint beside the new one.

Merge rules: board events union by event id, ordered by `compareEvents`; settings and identity last-write-wins per key (stamp from `HybridClock`, then device id; a local edit always ticks above the stamp it replaces; remote stamps are clamped to the receive time plus `MAX_DRIFT_MS` for ordering); library last-write-wins per board id, `lastActivityAt` merged by maximum, a tombstone for "forget" that beats an older put; workspace by `mergeWorkspace`.

## Board library

An entry (sealed in the `library` stream, never in a file name):

```ts
interface LibraryEntry {
  boardId: string          // room id
  title: string
  themeId?: string         // the board's theme, for the dot of the recent-boards list (unknown for a board saved from a link only)
  teamId?: string          // local team workspace reference (ADR-0027), if any
  role: 'facilitator' | 'participant'
  origin: 'created' | 'joined'
  fragment: string         // the link fragment holding the board keys, to reopen it
  hasPasscode: boolean     // the passcode itself is not stored; reopening asks for it
  solo: boolean            // a solo board: never to reach the real relay, on any device
  createdAt: number; lastActivityAt: number
  archived: boolean
  keepOffline: boolean     // this board's events are mirrored to the target and fetched eagerly
  stamp: { at: number; device: string }
}
```

- Created boards enter the library automatically (locally from group 1, in the target once a vault exists). A board the user only joined by link is listed only if they press "Save to my library", or turn on "Save boards I join" in Preferences > Sync (off by default).
- Open: builds the link from `fragment`, asks the passcode when `hasPasscode`, restores events from the replica or, if empty, from the target's stream for that board, then the normal relay path continues. Archive hides the board from the main list and keeps its data. Forget removes the entry (tombstone), stops mirroring the board's events and, after confirmation, deletes the board stream's segments from the target and the local replica. Forgetting a joined board never touches the board for others.
- `stores/recents.ts` keeps its API as a view over the library (the 12 latest by `lastActivityAt`); on first start the library imports the existing sealed recents and solo marks, so nothing is lost and no board is uploaded without a connected target.

## Local storage and migration (group 1)

`idb-target.ts` implements `SyncTargetPort` over a new object store `vault` in the existing `retroboard-replica` database (`replica-idb.ts` bumps `VERSION`, additive upgrade). Objects are in the same format as on a remote target, sealed with a local key derived from the existing non-extractable device key (`createLocalSealer().derive(label)` returns 32 bytes computed with the device key by a fixed-nonce encryption of a constant, so the device key is never exported and no second key is stored; a `CryptoKey` handle could not feed `HKDF`). Replica envelopes already sit sealed with the board key and stay in `envelopes`; the library, and in group 2 the settings and workspace, move into the vault with a one-time, idempotent migration that keeps the old keys for one release for rollback. In group 1 the library is one mutable sealed document `s/<stream>/local.rbs` of this local vault, written with an etag precondition so two tabs merge instead of overwriting; group 2 mirrors it to a target as immutable segments. The migration imports every legacy recent board, joined ones included, so nothing is lost; a board that already has a record, a tombstone included, is never imported again. The IndexedDB target keeps the offline working cache role for every later target: the target is the sync source of truth, IndexedDB the cache.

## Preferences > Sync (UX, group 2)

A "Sync" section in the preferences dialog (`ProfileDialog.vue`, `SyncSettings.vue`), also reachable from a link on `/boards`:

1. **Choose a folder.** "Sync with a folder" with the text "Pick a folder that your OneDrive, Google Drive, Dropbox, iCloud, Syncthing or Nextcloud client already syncs. RetroBoard puts encrypted files there; your sync client does the rest. Nothing is sent to us." Button "Choose folder" opens the directory picker. A browser without the File System Access API sees the matrix message instead (below). More providers appear as they ship; one with no configured client id is not offered.
2. **Create or unlock.** If the folder holds no vault: choose a password (12 characters or more, strength hint), then the recovery key screen (print, save as a file, or copy), then a screen that says in plain words: "Everything is encrypted before it is written. If you lose both your password and your recovery key, nobody, including us, can read what is stored: it cannot be recovered." The first sync starts only after both boxes "I stored my recovery key somewhere safe" and "I understand that a lost password and recovery key mean unreadable data" are ticked. There is no way to sync without a password and no way to turn encryption off. If a vault exists in the folder: ask for the password, or "Use my recovery key"; a vault is never overwritten.
3. **First sync.** The local library, settings, workspace and the events of boards flagged "keep offline" (on for boards created here) are written.
4. **Status.** A chip in the toolbar and a row in the dialog: Synced 2 min ago, Syncing, Offline, Locked (password needed), Allow folder access, Folder not found, Waiting for a file from your sync client, Needs attention (with the reason). "Sync now", the list of devices (names sealed in manifests), and the recovery key can be shown again after the password. Local editing always continues.
5. **Disconnect and forget.** Stops sync and deletes the folder handle, the vault key and cached settings from this browser; optional box "Also delete the vault files from the folder" (asks the password, deletes only files whose names match the vault pattern). Local boards stay.

Switching device end to end: new device, Preferences > Sync, choose the same folder (the sync client has already brought the files), enter the password or recovery key, the library appears within one sync, the user opens a board and its events are read from its checkpoint and later segments for that board only, then the live relay path continues. A device that already has local boards merges: library by union, settings per key by newest stamp.

User documentation outline (`docs/user-guide/<fr|en>/sync.md`, manifest entry in `tests/docs/manifest.ts`, tour step, `pnpm docs:tour && pnpm docs:guide`): why sync; "it is just files": pick a folder your sync client already carries; password and recovery key and what happens if you lose both; changing device; what the folder's cloud can and cannot see; limits (Chromium desktop only for now, the sync client's delay, only while a tab is open); disconnect and forget. Privacy page and `docs/self-hosting.md` get a paragraph.

## Local folder adapter (group 2)

`folder-target.ts` over a `FileSystemDirectoryHandle` (`showDirectoryPicker({ mode: 'readwrite', id: 'retroboard-sync' })`). It runs in the page (no worker, no network, no CSP change); the Argon2id derivation runs in a first-party worker (`script-src 'self'`, no change).

- **Handle**: stored in IndexedDB (structured clone, `folder-handle.ts`), never synced, removed on disconnect. The vault lives in a `RetroBoard` subfolder the app creates inside the chosen folder, so a user who picks their whole OneDrive folder gets one clean directory (open question 9).
- **Permission**: at app start `queryPermission({ mode: 'readwrite' })`. `granted` (Chrome 122 and later keeps it across sessions when the user chose "Allow on every visit") needs nothing. `prompt` becomes the status "Allow folder access" with a button; `requestPermission` needs a click, so the app never tries it by itself, edits queue locally and nothing is lost. `denied`, a removed or moved folder (`NotFoundError`) become "Folder not found, choose it again", which re-runs the picker and keeps the same vault (the vault id decides). Each state has visible text, not only a colour, and is announced politely to assistive technology.
- **Pull without push**: the File System Observer is not available in every Chromium build, so the adapter does not depend on it. Pull triggers are the engine's (open, focus, visibility, `online`, timer, "Sync now"); a pass costs one listing of `m/` plus `getFile()` size and `lastModified` per manifest, not per segment, so a 60-second timer is cheap. The sync client's own delay (seconds to minutes) is expected and documented.
- **Atomic writes**: `createWritable()` writes to a swap file and replaces the target on `close()` (Chromium), so a reader never sees a half file from this adapter. The adapter does not rely on `move()` (not dependable outside the origin private file system), so "temp then rename" is the browser's own swap. After each write it re-reads size and compares. The swap file is a temporary name (`*.crswap`) that sync clients may notice: it is on the ignore list below. Create-only is "get without create, expect `NotFoundError`, then create"; names carry a random suffix, so the race is harmless.
- **Half-synced files from the user's sync client**: a file is *not ready* when it is zero bytes, when its size differs from the manifest's size for it, when its final chunk does not authenticate, or when its name is a placeholder (an iCloud evicted file is `.name.icloud`; reading may trigger the download, so retry). Not-ready files are skipped and retried on the next pass with backoff; after 24 hours the status says "Waiting for a file from your sync client". Nothing is ever deleted because it looked partial.
- **Names**: only names matching the vault patterns are read (`info.json`, `m/<device>.rbm`, `s/<stream>/<device>-<seq>-<rand>.rbs`, `s/<stream>/c-<hash>.rbc`); everything else is ignored, never deleted, never an error. That ignores temp names (`*.tmp`, `*.crswap`, `*.partial`, `*.crdownload`, `~$*`, `.~lock.*`, `.syncthing.*.tmp`, `.sb-*`) and **conflict copies** of an immutable object (`name (conflicted copy ...)`, `name (1)`, `name-<COMPUTER>` from OneDrive, `name.sync-conflict-<date>-<time>-<id>` from Syncthing): the original is intact, and a conflict copy has the same bytes anyway. The one shared mutable file, `info.json`, can produce a conflict copy when two devices change it at once; the engine recognises those names as extra `info.json` inputs, merges per property, writes the merged `info.json` and deletes only the recognised copy. Manifests have one writer, so a copy of one means a device id was restored on two machines; the engine keeps the newer by internal sequence and shows a warning in the status.
- **Safe names**: lowercase ASCII `[a-z0-9.-]` only, no leading dot, no trailing dot or space, no reserved Windows names (`con`, `nul`, `aux`, ...), so there are no case-insensitive collisions on Windows, macOS or the cloud clients, no Unicode normalisation issue, no `:` or `\`. Relative paths stay under 64 characters (`s/` + 26 + `/` + 13 + `-` + 8 + `-` + 8 + `.rbs`), so a deep user folder rarely reaches the 260 characters of old Windows paths. Segments stay under 4 MiB so cloud clients upload them quickly and a conflict stays small.
- **Capabilities**: `conditionalPut: 'none'` (etag is `size:lastModified`), `atomicPut: true`, `listsModifiedTime: true`. Only `info.json` and a device's own manifest are mutable, which is why this is enough.

### Browser support matrix (folder adapter)

| Browser | Folder sync | What the user gets |
|---|---|---|
| Chrome, Edge, Opera, Brave on Windows, macOS, Linux, ChromeOS | yes | Preferences > Sync works as described |
| Chrome on Android | no (`showDirectoryPicker` is not exposed) | the Sync section explains that folders need a desktop Chromium browser; boards stay on the device as today; the OneDrive adapter (group 3) is the answer |
| Safari (macOS, iOS), every browser on iOS | no | same message; boards stay local; OneDrive adapter later |
| Firefox (all platforms) | no | same message; OneDrive adapter later |

Detection is feature-based (`'showDirectoryPicker' in window`), never a user-agent test. Until group 3 ships, a user on a browser without the API has exactly today's behaviour (data in the browser), and the Sync section says what will make it work.

## OneDrive adapter (group 3, R3)

Microsoft Graph, delegated, app folder: all paths are under `/me/drive/special/approot:/<vault>/...`; the folder appears to the user as `Apps/RetroBoard` in their OneDrive. For phones and for browsers without the folder API.

- **Auth**: OAuth 2.0 authorization code with PKCE as a single-page application (public client, no secret). Authority `https://login.microsoftonline.com/common` (personal and work or school accounts), scopes `Files.ReadWrite.AppFolder offline_access`. Full-window redirect to the authorize endpoint (`code_challenge` S256, `state`, `login_hint` once known, `prompt=select_account` at connect and `prompt=none` for renewals), back to `/storage/callback` (added to `APP_ROUTES`), then `POST /oauth2/v2.0/token` from the worker (CORS is allowed for SPA registrations). `state` and the PKCE verifier live in `sessionStorage`; the page route is restored after the redirect.
- **UX**: end users never register anything. The Entra registration is a one-time project-level step by the maintainer, like the app id Joplin ships; the user presses "Sign in with Microsoft" with an Outlook, Hotmail or (where supported) work account and the app syncs files in its own OneDrive app folder. A provider with no configured client id (a self-hosted copy) is not offered.
- **Tokens**: the access token (about one hour) stays in the worker's memory; the refresh token is sealed with the device key and stored in IndexedDB (`token-store.ts`), never in `localStorage`, never sent anywhere but the token endpoint. A refresh token issued to a single-page application lives 24 hours and rotates on use, so after a day of no use the status becomes "Sign in again" and one click redirects (silent when the Microsoft session is alive). Expected, documented, not a bug.
- **Work and school accounts, to verify first (task 3.1)**: my recollection of the Graph documentation is that the app folder (`special/approot`) and `Files.ReadWrite.AppFolder` exist for OneDrive personal accounts only. If a work or school account cannot use them, v1 offers "Sign in with Microsoft" for personal accounts (Outlook.com, Hotmail, Live), work and school users use the folder path with their OneDrive sync client, and a broader scope (`Files.ReadWrite`, which reaches all the user's files) is rejected unless the owner decides otherwise.
- **Mapping**: `list` is `GET .../children?$select=id,name,size,eTag,lastModifiedDateTime&$top=200` following `@odata.nextLink`; `get` is `GET .../content` (follows the redirect to the download URL, CORS to confirm), etag from the item; `stat` is `GET` of the item; `delete` is `DELETE` (404 is success); folders are created on demand.
- **Put**: up to 4 MiB, `PUT .../content` with `If-Match: <etag>` for an update and `@microsoft.graph.conflictBehavior=fail` for `absent` (to confirm against a real account in 3.3). Larger: `POST .../createUploadSession` and `PUT` fragments of a multiple of 320 KiB to the `uploadUrl`, resumed from `nextExpectedRanges` after a failure. The engine keeps segments under 4 MiB, so the resumable path is the exception (large checkpoints), but it is implemented and tested.
- **Concurrency**: the Graph `eTag` with `If-Match`; a failed precondition gives `precondition-failed`, and the engine re-reads and merges `info.json`. Segments are create-only with a random suffix.
- **Throttling**: on 429, 503 and 509 honour `Retry-After` (seconds or date), otherwise exponential backoff with jitter from 1 s to 60 s, at most 3 requests in flight, 5 attempts per operation, then "Needs attention" and a retry on the next trigger. Throttling never loses data: local writes continue.
- **Disconnect and forget**: Microsoft identity offers no endpoint for an app to revoke a refresh token. The app deletes its tokens and key material locally (so it can no longer act), offers to delete the vault, and links the page where the user removes the app (`https://account.microsoft.com/privacy/app-access` for personal accounts). It says plainly that until the user removes the grant there, an old refresh token copied from a backup would still work for its remaining life (at most 24 hours without renewal).
- **CSP (opt-in origins)**: the page CSP is not touched. `/sync/onedrive.js` is a worker script served by the Worker with its own header `default-src 'none'; connect-src https://login.microsoftonline.com https://graph.microsoft.com <upload session hosts>`; the upload session hosts (`api.onedrive.com`, `*.sharepoint.com`) are confirmed in 3.1. The script is loaded only when the user picks OneDrive, so `login.microsoftonline.com` and `graph.microsoft.com` are opt-in origins: nothing is allowed for a user who never connects. Task 3.1 proves in Chromium, Firefox and WebKit that a dedicated worker takes the CSP of its own script response (and fails closed if not, with the ADR's fallback). The e2e harness adds its fake Graph origin through the existing `extraConnect` mechanism of `buildCsp`, set only by the test environment variable.

### What the owner creates in Microsoft Entra (one time, by the maintainer, no client secret; needed for group 3 only)

1. Sign in at `https://entra.microsoft.com` with an account that owns a tenant (a free tenant is enough; a personal Microsoft account can create one through a free Azure sign-up). End users never do this and never see it.
2. Entra ID, App registrations, New registration. Name: `RetroBoard`. Supported account types: **Accounts in any organizational directory (any Microsoft Entra ID tenant, multitenant) and personal Microsoft accounts** (`signInAudience` `AzureADandPersonalMicrosoftAccount`). If task 3.1 shows that work accounts cannot use the app folder, still choose this value: personal accounts need it.
3. Redirect URI: platform **Single-page application (SPA)** (not Web, not Mobile and desktop: that is what turns on PKCE with CORS on the token endpoint). Add: `https://<production host>/storage/callback` (the host of the hosted site), `http://localhost:8787/storage/callback` (`pnpm dev:worker`), `http://localhost:3000/storage/callback` (Nuxt dev server). Preview hosts (`*.workers.dev`) cannot be wildcarded: sign-in does not work on previews unless a host is added by hand. Each self-hosted deployment registers its own app with its own host.
4. Authentication tab: leave "Allow public client flows" off, no implicit grant boxes ticked, no front-channel logout URL.
5. API permissions: Add a permission, Microsoft Graph, **Delegated**: `Files.ReadWrite.AppFolder` and `offline_access`; remove `User.Read` (not needed). None needs admin consent. Do **not** add `Files.ReadWrite` or `Files.ReadWrite.All`.
6. Certificates and secrets: create nothing. There is no client secret.
7. Branding and properties: name, logo (from `brand-identity` once approved), home page URL, privacy statement URL (`/privacy`) and terms of service URL (`/terms`) of the hosted site. Publisher verification is optional for personal accounts; some work tenants block consent to unverified publishers (open question 3).
8. Copy the **Application (client) ID** (a GUID, public by design). Put it in the public runtime configuration (variable `NUXT_PUBLIC_ONEDRIVE_CLIENT_ID`, final name set in task 3.2, empty by default so a copy of the site without it hides OneDrive) and in `wrangler.jsonc` `vars` for the hosted deployment.
9. Hand the client id and the hosted host name to the agent: nothing else is secret and nothing is stored on our side. Live check by the owner (`docs/owner-checks.md`): sign in with an Outlook account on the hosted site, create a vault, see `Apps/RetroBoard` in OneDrive, open a second browser, enter the password, see the library.

## Providers after OneDrive (groups 4 to 9), in order

- **GitHub (4)**: a private repository. Auth is a fine-grained personal access token limited to one repository with `Contents` read and write, typed by the user and sealed locally: GitHub's device flow would need no secret but its endpoints do not allow browser CORS, and the web flow needs a client secret, so a token is the only browser-safe way. Private check: `GET /repos/{owner}/{repo}` must say `private: true` at connect and at the start of every sync session; a repository that turns public stops sync with "Needs attention", and a public repository is refused at connect. Mapping: the Git Data API (blobs, trees, one commit per sync cycle) so a cycle is one commit, not one request per file, which keeps within the secondary rate limits for content creation; the branch ref etag is the change detector (a `304` does not count against the 5,000 requests an hour); the tree sha gives `If-Match` semantics for `info.json`; the `contents` API stays for small reads. Limits: GitHub refuses files over 100 MiB (segments are far smaller), a repository should stay under about 1 GiB (compaction matters more here). Bonus: the commit history is a version history of ciphertext; commit messages are fixed (`sync`), and commit author and time reveal the account and rhythm. `connect-src https://api.github.com` in its own worker script.
- **Google Drive (5)**: scope `drive.appdata` only, files in the hidden `appDataFolder`. Auth from a static site is the weak point: the authorization code flow needs a client secret even with PKCE for a web client, and Google's own browser library is a third-party script the CSP forbids, so the plan is the implicit token redirect (`response_type=token`), which gives a one-hour access token and no refresh token: the user signs in again on the next sync after an hour of use (a redirect, silent while the Google session lives). To confirm at implementation that Google still serves it for new clients; otherwise the Google Drive for desktop folder (group 2) is the supported path and this group is dropped. Registration in Google Cloud: a project, the OAuth consent screen (external, in production, privacy and terms URLs, domain verified), an OAuth client of type Web application with the redirect URIs, the Drive API enabled. `drive.appdata` is a non-sensitive scope, so no security assessment is expected (to confirm). The user cannot browse appData files, so "delete my vault" is the way to free space. Origins `www.googleapis.com`, `oauth2.googleapis.com`.
- **Dropbox (6)**: App Console app, scoped access, **App folder**, permissions `files.content.read` and `files.content.write`, authorization code with PKCE and `token_access_type=offline` (a long-lived refresh token, no secret), redirect URIs as for OneDrive. A new app starts in development status with a cap on linked users until Dropbox approves production (cap to confirm). Origins `api.dropboxapi.com`, `content.dropboxapi.com`. Listing by `list_folder` with a cursor; `rev` is the etag (`mode: update` with `rev` for `If-Match`, `mode: add` for create-only).
- **WebDAV (7)**: Basic auth with an app password, `PROPFIND` depth 1, `PUT` with `If-Match` and `If-None-Match: *`, `MKCOL`, `DELETE`, write to `tmp/` then `MOVE` where `PUT` is not atomic. HTTPS only. Runs in the `net` worker (`connect-src https:`, credentials pinned to the origin they were entered for). The server must answer CORS preflight for `PROPFIND`, `MKCOL`, `MOVE`, with `Authorization`, `Depth`, `If-Match`, `If-None-Match`, `Content-Type` allowed, unauthenticated; many servers (Nextcloud by default) do not, and a Nextcloud user can use the folder path with the Nextcloud client instead. The group ships tested configurations (a WebDAV container in CI, a reverse-proxy header snippet) and a connect check that explains a CORS failure in plain words.
- **S3-compatible (8)**: endpoint, bucket, region, access key id and secret, signed in the browser with SigV4 over WebCrypto (no SDK dependency), path-style addressing for non-AWS stores, `ListObjectsV2`, `If-None-Match: *` and `If-Match` probed at connect and recorded in the capabilities (AWS supports them, others vary). The bucket needs a CORS rule (allowed origin, methods `GET PUT DELETE HEAD`, headers `authorization`, `x-amz-*`, `if-match`, `if-none-match`, `content-type`, exposed `ETag`). The key sits in the browser, so the docs say: a dedicated bucket and a key limited to it (policy snippet), never an account key. `net` worker.
- **Generic HTTP (9)**: for anything that can store and serve files. A minimal profile published in `docs/storage-http.md`: `GET`, `PUT` (optional `If-Match`, `If-None-Match: *`) and `DELETE` on `<base>/<path>`, a bearer or custom header token, and a listing `GET <base>/?prefix=<p>` answering JSON `[{ "path", "size", "etag" }]`; a store with no listing is refused (the vault needs it; the docs show a ten-line Worker or `rclone serve` that adds it). S3 presigned URLs cannot be minted without credentials, so "presigned" is covered by the S3 adapter (keys) or by a user-run signer behind this profile. `net` worker.
- **Device pairing (10)**: the new device shows a code; the first device shows a QR that carries the target settings, the credentials and the unlock key sealed with a one-time key typed as ten words (the QR alone is useless, no server in between). The printable recovery page and "Stay unlocked on this device" settle here if cut from group 2. Export files, backup files and readable (Markdown) copies are not part of this change: they belong to the export features and nothing readable is ever written to a target.

## Security and privacy note

What the relay observes: nothing new (no change to the relay or the protocol). What a target observes: see the ADR (object count, sizes padded to 1 KiB buckets, timing, device count, board count, key ids, account). For a folder, the cloud behind the sync client sees the same, plus the folder path it already knows. What we observe: nothing for the folder; one Worker request when a user loads a provider script. Secrets and where they live: master key in memory (and, if "stay unlocked on this device" is on, a non-extractable key in IndexedDB), folder handle in IndexedDB, refresh tokens and credentials sealed with the device key in IndexedDB, nothing in `localStorage`, nothing in a URL, nothing sent to a server of ours. Content-free logs: adapters never log paths with names or any response body. The strict CSP, the cookie-free and tracker-free rules are untouched; `connect-src` additions exist only on provider worker scripts from group 3 (ADR-0039).

## Challenged defaults (and why)

- The `E2EE` flag of `info.json` is dropped: Joplin needs it because its target may be unencrypted; ours is always sealed, so `info.json` carries `cipher` and `minReader` instead.
- One global manifest is replaced by one manifest per device: a single mutable file shared by all devices needs a compare-and-swap that folders and WebDAV do not give; per-device manifests have one writer.
- The brief's phasing put WebDAV before the OAuth clouds; the owner's later order (folder, then OneDrive, GitHub, Google Drive, Dropbox, WebDAV, S3, generic HTTP) is kept, and groups 3 to 9 are independent so they can be reordered. WebDAV and S3 depend on CORS the user's server may not have, which is why they are late.
- Google Drive keeps the owner's place (after GitHub) but is the weakest cloud: no secret-free refresh in the browser (above), and the Google Drive for desktop folder already works from group 2.
- The KDF is Argon2id in pure JavaScript, not a wasm build (it would need `'wasm-unsafe-eval'` in the page CSP) and not PBKDF2 alone.
- The vault engine is in group 2 with the folder adapter, not in group 1: group 1 stays the interface, the fake, the format, the library and local encryption, as the owner asked; the engine is tested against the fake first, then the folder.

## Phasing and files per group

Groups 1 and 2 sit in R2 (priority 1, no registration, no CSP change); groups 3 to 10 sit in R3 (`GROUP_OVERRIDES` in `scripts/github/sync-issues.mjs`). Each group is one PR with its own tests, i18n keys (fr, en), guide and docs updates.

- Group 1 touches: `packages/application/src/ports/sync-target.ts`, `ports/index.ts`, `src/storage/{library,settings-sync,workspace-merge}.ts` (pure parts); `packages/crypto/src/vault.ts`, `kdf.ts`, `recovery.ts`, `index.ts`, `package.json` (`@noble/hashes`); `packages/testkit/src/sync-target.ts`, `contract.ts`; `apps/web/app/adapters/replica-idb.ts` (version), `adapters/device-key.ts`, `adapters/sync/idb-target.ts`; `stores/library.ts`, `stores/recents.ts`; `pages/boards.vue`, `components/LibraryList.vue`; `packages/i18n` fr and en.
- Group 2 touches: `packages/sync/src/vault/*`, `packages/application/src/storage/*` (use cases), `packages/testkit/src/fake-directory.ts`; `apps/web/app/adapters/sync/folder-target.ts`, `folder-handle.ts`; `stores/vault.ts`, and `stores/settings.ts`, `identity.ts`, `team.ts` through one `syncedSettings` composable (not per-store hacks); `components/SyncSettings.vue`, `ProfileDialog.vue`, `AppToolbar.vue` (status chip); `tests/e2e/` (folder spec on the origin private file system with the picker stubbed; the two-device spec with a sync-client simulator that copies the folder between two browser contexts; the plaintext canary test; added to `tests/e2e/core.json`); `tests/docs/manifest.ts`, `docs/user-guide/{fr,en}/sync.md`, `docs/self-hosting.md`, `docs/owner-checks.md`, privacy page.
- Group 3 touches the OneDrive files listed above plus `apps/relay/src/core/headers.ts`, `errors.ts`, `apps/relay/test/worker.test.ts`, `scripts/ci/test/asset-headers.test.ts`, `apps/web/scripts/asset-headers.mjs`, a build step emitting `public/sync/onedrive.js` unhashed (counted by `scripts/check-bundle-size.mjs`), `pages/storage/callback.vue`, `wrangler.jsonc`, `docs/storage-onedrive.md`, `packages/testkit/src/fake-graph.ts`.

## Risks

- File sync clients are not under our control: delay, half-synced files, conflict copies, evicted placeholders. The engine never trusts a file it cannot authenticate, never deletes what it does not recognise, and the status says what it waits for.
- Permission prompts every session in browsers without persistent permissions: edits queue locally and the status asks for one click.
- A browser that applies the page CSP to worker fetches would block the network adapters: task 3.1 is a go or no-go (fallback in the ADR).
- Argon2id speed on low-end devices: the benchmark (task 1.4) sets parameters, and the parameters in each wrap let a slow device unlock a vault created elsewhere (it takes longer, it works).
- Clocks: a device with a wrong clock cannot pin a setting (clamping, ADR).
- Quota: a full disk or cloud quota stops the sync client, not our writes; a full target pauses sync and never deletes anything.
- Key loss is unrecoverable, said at creation, on the recovery key screen and in the guide.

## Open questions for the owner

1. Which providers after the folder? The plan is OneDrive, GitHub, Google Drive, Dropbox, WebDAV, S3, generic HTTP; WebDAV and S3 need CORS on the user's server, Google has the hourly sign-in.
2. Work and school accounts: if the OneDrive app folder is personal-only (task 3.1 confirms), do we ship personal accounts only and send work users to the folder path, or accept a broader scope for them?
3. Entra (group 3): who owns the tenant and registration (the company MAIDAF EURL or personally), and is publisher verification wanted (needs a Microsoft Partner Network id) so work tenants can consent?
4. Password KDF: Argon2id in pure JavaScript (recommended) versus PBKDF2 only (simpler, weaker offline resistance, already in the code); the benchmark decides parameters.
5. Safari, Firefox, iOS and Android browsers: they get nothing in R2 (boards stay local as today) until the OneDrive group. Acceptable for the launch, or should group 3 move into R2?
6. "Stay unlocked on this device" default: on (a non-extractable key in IndexedDB, convenient, an XSS could use it) or off (password each session)?
7. Should joined boards be saved to the library by default (this spec says no, opt-in)?
8. GitHub: is a personal access token acceptable, given the device flow cannot run in a browser?
9. The vault lives in a `RetroBoard` subfolder of the chosen folder; fine, or should the picked folder itself be the vault root (Joplin does the latter)?
