# Tasks

## 1. The shield button

- [ ] 1.1 Local icon set for the sync shield (a shield with arrows, one shape per `VaultStatus`, drawn on the lucide grid and stroke, bundled, own work so no licence question) and `syncStatusIcon` returning it; verify unit test that every `VaultStatus` has an icon and that the icons differ in shape, and the design token test
- [ ] 1.2 `SyncChip.vue` becomes the shield button at the start of `AppToolbar.vue` beside `EncryptionBadge`, shown always (not only when connected), state words in the accessible name and tooltip, 44 px touch target, kept among the items that stay on phones; press syncs now when connected and unlocked, opens the unlock prompt when locked, does the single recovery action when one exists, and opens Preferences > Sync (the onboarding of group 3 once it exists) when sync is not set up; a polite "Synced 12:03" message with a "Settings" link; the context menu (right click and long press) as an extra path; fr and en keys; verify e2e on the origin private file system (press syncs, locked prompts, not set up opens settings), keyboard and screen reader names, axe, and the toolbar overflow check on phone to TV widths

## 2. Any folder

- [ ] 2.1 Folder choice that makes no provider assumption: a refused directory (abort or security error from the picker) explains why and proposes a subfolder name; "Choose another folder" re-points the vault by vault id; a picked folder that already holds a vault offers "Use this vault" or "Create a new one here" and never merges two vaults; verify unit tests with a stubbed handle (refused, same vault, other vault, empty folder) and an e2e of moving the vault to another folder
- [ ] 2.2 Wording and guide: remove provider-specific sentences from the folder path, say once that carrying the folder is the user's own business, list what was tested in the guide chapter without promising it; verify `pnpm docs:tour && pnpm docs:guide`, `pnpm docs:check` and the pseudo-locale overflow check

## 3. Onboarding

- [ ] 3.1 `SyncSheet.vue`: the three plain sentences, the paths this device can really do chosen by feature detection and ordered by the rules of `design.md`, "Why not a cloud account?", opened from the shield, Profile and the nudge; paths of later groups appear when they ship; verify unit tests of the chooser (desktop Chromium, Safari, Firefox, Android Chrome, installed iOS app, each by stubbed features, never by user agent), e2e and axe
- [ ] 3.2 One-time nudge after the first board is created: a dismissible line, never a dialog, never during a running phase, "Not now" remembered per device (a per-viewer convenience, failing safe when storage is blocked); verify e2e (appears once, dismissed stays dismissed, absent in a running phase) and the guide chapter "Keep your boards everywhere" (fr and en) with the manifest, `pnpm docs:tour && pnpm docs:guide`

## 4. Sealed vault file

- [ ] 4.1 `.rbv` format and reader in `packages/sync` (header, sealed objects, length index, final-chunk check, a size limit), shared writer for `local-data-durability` 2.2 and `export-destinations-v2`; verify unit tests with fixed vectors, truncation, reorder, wrong vault, wrong password, and the plaintext guard over every byte with canaries
- [ ] 4.2 Export through `navigator.share({ files })` when `canShare` allows it, a download otherwise; import through a file input into the local target followed by the normal union, creating the local copy on a device with no vault after asking the password; "last backup" line (never red); verify e2e with the share sheet stubbed both ways, an import on a second context that shows the library and opens a board, and axe
- [ ] 4.3 Documentation: the guide chapter, privacy page sentence (what a mailed or stored `.rbv` shows), `docs/owner-checks.md` (iPhone Files and AirDrop, Android share); verify `pnpm docs:check`

## 5. Pairing without a platform

- [ ] 5.1 Spike and ADR: does the current room protocol carry a PAKE rendezvous unchanged (envelope validation, `maxConnections`, the `sig` budget), which PAKE (CPace or SPAKE2) and which audited implementation, expiry and attempt limit; write the ADR with `pnpm adr:new`, and if a frame type is needed the protocol spec and its tests; verify `pnpm adr:check`, `packages/protocol` tests and the relay contract
- [ ] 5.2 Pairing exchange: the first device shows a short secret as a QR and as words, the second enters it, both derive the key through the PAKE, the vault key and a target descriptor (never credentials) are sent sealed, 2-minute expiry, one attempt per code; `JoinScanner.vue` reused with the typed words as a first-class path; verify unit tests with published PAKE vectors, a wrong guess, an expired code and a relay that records everything (it learns nothing usable), and e2e with two contexts
- [ ] 5.3 Optional data path over the WebRTC channel with relay fallback: exchange manifests, send the missing sealed segments both ways, resume after a drop; verify e2e with two contexts that end with the same library and an unplugged channel that resumes, and that `user-drive-storage` group 10 is marked as replaced by this group in its `tasks.md` in the same pull request

## 6. Phones

- [ ] 6.1 PKCE state of the OneDrive sign-in in a sealed IndexedDB entry with a short expiry instead of `sessionStorage`, with a clear error when the state is lost; verify unit tests (expiry, replay refused, lost state) and the e2e against the fake identity endpoint
- [ ] 6.2 "Stay unlocked on this device": explicit opt-in screen, a non-extractable key in IndexedDB, an off switch, the default decided by the owner; verify unit tests and e2e (reload stays unlocked, turning it off locks again)
- [ ] 6.3 Browser matrix text per browser by feature detection in place of "OneDrive adapter later", and the installed-app note (separate storage from Safari); verify e2e with features stubbed
- [ ] 6.4 Real-device checks recorded in `docs/owner-checks.md` with their result: OneDrive sign-in return in an installed iOS app, share sheet and Files import on iPhone, Android share and import, storage eviction after seven days; the Microsoft app registration of `docs/storage-onedrive.md` is the owner's step; verify the owner-checks entries exist and `pnpm docs:check`
