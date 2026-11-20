# Proposal

## Why

Owner notes (2026-11-20), three that are one product question:

- (12) "Sync should work in any folder; the user is responsible for syncing the vault wherever they want."
- (13) "The sync button moves to the left with a shield encryption icon style; clicking it just syncs now."
- (14) "The sync menu should be better placed and well onboarded: it is a key feature; no account, an encrypted vault you can sync everywhere; find a better way for non-expert users without depending on any platform, and possible on phones."

`user-drive-storage` built the engine and, in R2, the folder adapter and Preferences > Sync (groups 1 and 2 are closed; OneDrive, group 3, is built and hidden until the owner registers the Microsoft app). What is missing is the product around it. Today:

- The sync status chip sits at the far right of the toolbar, next to the profile, appears only after a folder is connected, and opens the whole profile dialog when pressed (`SyncChip.vue`). A person who never connected a folder never learns the feature exists, and a person who did cannot just press a button to sync.
- The setup is a section of the profile dialog (`SyncSettings.vue`) that starts with "choose a folder", which means nothing to someone who does not know what a vault is, and is a dead end on a phone: the folder picker exists only in desktop Chromium, so Safari, Firefox, iOS and Android show a "not supported" line.
- The scout report on mobile sync (2026-11-20, kept as `mobile-sync-report.md` in this change) found that OneDrive alone is a weak mobile answer (personal accounts only, a refresh token that dies after 24 hours, an iOS redirect behaviour that is unproven), that iCloud and Google have no usable browser API under the strict CSP, and that iOS has no background sync. Its conclusion: ship the sealed vault file and a device pairing that needs no cloud account at all, then adapters by their value on a phone.

The direction is fixed by the owner: no account, encrypted by default, and no dependence on any platform.

## What Changes

Six task groups, in this order. Groups 1 to 3 are small and aim at the R2 launch (before the 2026-12-09 feature freeze if capacity allows, otherwise right after the launch); groups 4 to 6 are R3.

1. **The shield button (13).** The sync control moves to the start of the toolbar, beside the board's encryption badge, and uses the same shield icon family with a state per shape: off (outlined, grey), synced, syncing (arrows turning), locked, needs attention, offline. It is shown to everyone, connected or not, because it is how the feature is discovered. When sync is connected and unlocked, pressing it syncs now and confirms with a short polite message ("Synced 12:03"); locked opens the unlock prompt; not set up opens the onboarding of group 3. Settings stay in Profile and are one link away from the confirmation message and from the button's menu on long press or right click, never the only way to reach them.
2. **Any folder (12).** The vault works in whichever folder the person picks, carried by whatever they use (a OneDrive, Dropbox, Google Drive or iCloud folder, Syncthing, a NAS, a USB key). The app makes no assumption about the provider and shows no provider-specific text in the folder path. It handles the folders a browser refuses (some system folders are refused by the picker) by explaining and proposing a subfolder, lets the person choose another folder later without losing the vault (the vault id inside `info.json` identifies it), recognises an existing vault in a picked folder ("Use this vault" or "Create a new one here") and works from a folder that a sync client has only half downloaded (existing tolerance of `user-drive-storage`, task 2.4).
3. **Onboarding (14).** One "Keep my boards on all my devices" sheet opened from the shield, from the first-board nudge and from Profile. It says in three plain sentences what the feature is (no account, an encrypted vault, you choose where it lives and whatever carries that place carries only unreadable files), then offers only the paths this device can really do, the best one first: a folder (desktop Chromium), another device I have with me (pairing, group 5), a file I save or send myself (sealed vault file, group 4), a Microsoft account when the owner has enabled it. A non-blocking, dismissible, once-only nudge appears after the person's first board is created; nothing is ever opened by itself during a retro.
4. **Sealed vault file (R3).** Save the whole encrypted vault as one `.rbv` file through the share sheet or a download, and open one on another device. It covers iCloud and every platform without a folder picker, is the safety net against browser storage eviction on iOS, and is the same file that `local-data-durability` ("Save a board file") and `export-destinations-v2` ("Backup") need, so there is one format, not three. A "last backup" line shows the age of the last file.
5. **Pairing without a platform (R3).** Two devices that are both open exchange the vault key and a target description through the relay with a password-authenticated key exchange, and may send the missing encrypted segments directly, so a person with a laptop and a phone needs no cloud account and no shared folder. This replaces group 10 of `user-drive-storage` as the pairing design (the report explains the three changes).
6. **Phones (R3).** "Stay unlocked on this device", the sign-in state that survives an app switch, the browser matrix text per browser by feature detection, and the real-device checks of the report.

Out of scope: any storage or account of ours, new network adapters (Dropbox, WebDAV, GitHub, Google Drive stay in `user-drive-storage` groups 4 to 9), background sync with no tab open (impossible on iOS), a managed sync service, sharing a vault between people.

Bounded contexts: Board session (the replica and the library), Profile and Team (settings), Sharing (pairing), the web toolbar. Relay traffic: groups 1 to 4 none; group 5 adds a short rendezvous exchange per pairing, rare and small (see `design.md`), memory-only like every room.

## Capabilities

### New Capabilities

None. The requirements are added to the capabilities that `user-drive-storage` introduces.

### Modified Capabilities

- `user-storage`: the shield button, any folder, onboarding, pairing, phones.
- `storage-vault`: the sealed vault file.

## Impact

- Web: `AppToolbar.vue`, `SyncChip.vue` (becomes the shield button), a new `SyncSheet.vue`, `SyncSettings.vue`, `stores/vault.ts`, `boards.vue` and `new.vue` (nudge), icon set (a custom shield-with-arrows glyph), i18n fr and en, guide chapter `docs/user-guide/{fr,en}/sync.md`, owner checks.
- Application and crypto: the `.rbv` writer and reader over the existing sealed objects, the pairing exchange (CPace or SPAKE2 through audited primitives only).
- Protocol and relay: group 5 may need a rendezvous frame or accept the existing signalling unchanged (a spike decides, task 5.1); an ADR records it. Group 1 to 4: none.
- Docs: ADR for the mobile and no-platform paths, `docs/owner-checks.md` (iOS installed app, Android, eviction), `docs/architecture.md`.
- Needs the owner: registering the Microsoft app (`docs/storage-onedrive.md`) and testing on a real iPhone and a real Android phone.
