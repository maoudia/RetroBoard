# Scout report: sync on mobile devices (RetroBoard, change `user-drive-storage`)

Date: 2026-11-20. Task: read-only design research. Nothing was pushed, no PR was opened, no repository file was changed.
Worktree: a disposable scout worktree (path omitted).

## 1. Bottom line

1. **The mobile answer already exists in code but is switched off.** The OneDrive adapter (groups 3.1 to 3.4, ticked) is aimed at phones and at browsers without the folder picker. `wrangler.jsonc:53` has `"ONEDRIVE_CLIENT_ID": ""`, so the provider is hidden everywhere. `docs/owner-checks.md` lists the live check as still to do. Registering the Entra app (about 30 minutes of the owner's time) and running the check on a real iPhone and a real Android phone is the cheapest step towards mobile sync.
2. **OneDrive alone is a weak mobile experience, and it covers one provider only.** It has three problems:
   - Personal Microsoft accounts only (ADR-0039 spike).
   - The refresh token dies 24 hours after sign-in, whatever was renewed in between (ADR-0039, "Tokens: the 24 hours are absolute"). Because the vault key lives in memory, the vault password is asked again after that redirect. On a phone this is a daily sign-in plus password.
   - Mobile users are mostly on iCloud or Google, and neither has a usable browser API for us (section 3).
3. **Recommended plan.** Take one step in each of three tracks, in this order:
   - Make OneDrive live.
   - Add the **sealed vault file** (export and import through the share sheet and the Files app). It is the universal fallback, it covers iCloud, and it doubles as the backup `local-data-durability` already wants.
   - **Device pairing through the relay**, redesigned from the current group 10: a PAKE-secured rendezvous that moves the vault key and, optionally, the sealed objects device to device.
   - Then add network adapters by their value on a phone, **Dropbox** before WebDAV before GitHub. Skip Google Drive unless the owner accepts a token-exchange endpoint on our Worker.
4. **Do not rely on background sync on iOS.** It does not exist. Sync must stay "while the app is in the foreground", which is what the scheduler (visibility, focus, `online`, 60 s timer) already does.
5. **Storage eviction on iOS is a real risk**, and it is the reason the file fallback and the pairing path matter. An installed home-screen app is treated better than a Safari tab. `navigator.storage.persist()` support on iOS is inconsistent in the sources I found, so it has to be tested on a device.

## 2. What I read in the repo (evidence)

| Fact | Where |
|---|---|
| The port is `SyncTargetPort` (list, get, put with `ifMatch`/`'absent'`, delete, stat) plus a `TargetCapabilities` record. `TargetKind` already names `idb`, `folder`, `onedrive`, `github`, `gdrive`, `dropbox`, `webdav`, `s3`, `http`. | `packages/application/src/ports/sync-target.ts:5-62` |
| Vault layout: a mutable `info.json` and one manifest per device, plus immutable sealed segments. Union by event id, no locks. | `docs/adr/0039-...md`, "Layout of a vault on a target" |
| The folder adapter is detected by `'showDirectoryPicker' in scope`. | `apps/web/app/adapters/sync/folder-handle.ts:16` |
| The design's own browser matrix: Chrome on Android, Safari (macOS and iOS), every iOS browser and Firefox get no folder sync, and "OneDrive adapter later". | `openspec/changes/user-drive-storage/design.md:157-167` |
| OneDrive is built: Graph adapter, PKCE, worker with its own CSP header (`SYNC_WORKER_ORIGINS`), fake Graph. Only 3.5 (docs regeneration and the owner's live check) is open. | `openspec/changes/user-drive-storage/tasks.md` (group 3), `docs/storage-onedrive.md`, `apps/relay/src/core/headers.ts:49` |
| `ONEDRIVE_CLIENT_ID` is empty, so OneDrive is hidden. | `apps/relay/wrangler.jsonc:53` |
| An IndexedDB target already exists (browser copy and offline cache of every target). | `apps/web/app/adapters/sync/idb-target.ts` |
| Groups 4 to 9 (GitHub, Google Drive, Dropbox, WebDAV, S3, generic HTTP) are open. Group 10 (pairing) is open and says: "the first device shows a QR that carries target settings, credentials and the unlock key sealed with a one-time key typed as ten words". | `tasks.md`, `design.md:205` |
| "Stay unlocked on this device" is an open question 6 (default on or off). It matters most on phones. | `design.md:245` |
| The relay is a memory-only forwarder: rooms, WebRTC signalling (`sig` frames), presence, no storage. | `apps/relay/src/core/room.ts:20-30`, `packages/protocol/src/budgets.ts` |
| `JoinScanner.vue` reads a QR with `BarcodeDetector` and falls back to a paste field. | `apps/web/app/components/JoinScanner.vue:1-40` |
| The app is a manifest-only PWA: `display: standalone`, icons incl. maskable, no service worker. | `apps/web/public/manifest.webmanifest`; no `serviceWorker` match in `apps/web/app` or `public` |
| `requestPersistence()` is called and its answer discarded. The open change `local-data-durability` (tasks 2.1 to 2.3) adds the "protected / may be cleared" row and a one-time "Save a board file" proposal. | `openspec/changes/local-data-durability/proposal.md`, `replica-idb.ts:3` |
| `export-destinations-v2` already plans a "Backup export to a file the user saves in any drive folder". | `openspec/changes/export-destinations-v2/proposal.md:8` |

Verification limits: I ran no tests and no browser. The web findings are from search results only (listed at the end). Where a source was weak or contradictory I say so; those points are marked **[verify on device]**.

## 3. Options, evaluated

Scale for effort: engineer-days of focused work including tests, e2e, i18n fr/en, docs and the guide, in the repo's one-PR-per-group style. Estimates, not measurements.

### 3.1 Cloud adapters over HTTP

All of them run in a provider worker with its own CSP (ADR-0039), so none changes the page policy. That mechanism works the same on mobile.

| Provider | Mobile fit | Auth from a static site | Blockers and risks | Owner registration | Effort |
|---|---|---|---|---|---|
| **OneDrive** (built) | Good on iOS and Android. Personal accounts only. | PKCE code flow as an SPA, no secret. | The 24 h absolute refresh limit means a daily redirect plus password. The upload and download hosts of personal accounts, simple `PUT` preconditions and CORS of `*.up.1drv.com`/`*.files.1drv.com` are unproven live (ADR-0039 lists them as owner checks). The PWA redirect behaviour on iOS is untested **[verify on device]**. | Entra app: SPA platform, redirect URIs for the production host, `localhost:8787`, `localhost:3000`, permissions `Files.ReadWrite.AppFolder` and `offline_access`, no secret. Client id into `ONEDRIVE_CLIENT_ID`. Steps are in `docs/storage-onedrive.md`. | 0.5 d (finish 3.5, run the check), plus iOS spike 1 d |
| **Dropbox** | Best token lifetime of the cloud options. | PKCE with `token_access_type=offline` gives a long-lived refresh token. A refresh needs only the app key, no secret (Dropbox OAuth guide and forum posts in search results). The refresh token is not rotated, so it does not expire daily. | The App Folder app starts in "development" status with a cap on linked users until Dropbox approves production. The search found nothing about the size of the cap; from memory it is small (a few hundred) but **I could not confirm it**. The upload endpoint needs the `Dropbox-API-Arg` header, so CORS preflight behaviour and the `If-Match` equivalent (`mode: update` with `rev`) must be proven by a spike. | Dropbox App Console: scoped app, App folder, scopes `files.content.read` and `files.content.write`, redirect URIs, app key (public). Production approval before launch. | 3 to 4 d (task 6.1, 6.2 as written) |
| **WebDAV, incl. Nextcloud** | Strong for self-hosters, none for ordinary phone users. | Basic auth with an app password. | Browsers need CORS on the server. Search results confirm Nextcloud does not answer the preflight for `PROPFIND` and `Authorization` by default; users fix it in the reverse proxy. This is the same risk as the design's "Server without CORS" scenario. Needs the shared `net` worker with `connect-src https:`. | None (the user types the URL). | 5 to 6 d (7.1 to 7.3), mostly the `net` worker spike and the CI container |
| **GitHub** | Technically fine on a phone (api.github.com, fine-grained token), poor for the target audience. | A pasted fine-grained token, no OAuth app. | A mobile user has to create a token by hand. Contents API caps a file at 100 MB and a directory listing at 1,000 entries (changelog and docs in search results), so listing must use the Git Trees API. I could not confirm CORS or secondary rate limit thresholds from search. | None (token pasted by the user). | 4 to 5 d (4.1, 4.2) |
| **Google Drive** | Wanted by many Android users. Hardest to build. | The design plans an implicit token (about one hour, no refresh token). Google's own pages still describe the implicit grant for JavaScript apps, and Google's helper library is a third-party script the CSP forbids. A 2025 write-up quoting a Google forum reply says the "Web application" client type needs a secret even with PKCE. This is unconfirmed, so both routes are fragile. | Sign-in at least every hour (redirect). If the implicit grant disappears the only route is a token-exchange endpoint on our Worker, which holds a client secret and sees tokens in transit. That conflicts with "tokens never leave the browser" and needs an ADR. | Google Cloud project, consent screen in production with privacy and terms URLs, web client, Drive API enabled; `drive.appdata` is classed non-sensitive (verification still needed). | 4 d, only after the go or no-go spike 5.1 |
| **iCloud Drive** | The common iPhone case, with no browser path. | CloudKit JS is a third-party script (CSP) and needs a paid Apple Developer account. | Not recommended. The file route (3.4) is the way for iCloud users. | n/a | not planned |

### 3.2 OPFS only, plus export

OPFS (the origin private file system) has been in iOS Safari since 15.2 (search results, WebKit blog). Writes need `createSyncAccessHandle()` in a worker on older Safari, and Safari 26 reportedly adds the writable stream, possibly behind a flag.

What the repo already has makes OPFS add little: `idb-target.ts` is already the local vault copy and works on iOS. OPFS would only help with large objects and is not a sync target. **Skip it for sync.** Its real content is "local only plus a file export", which is the file fallback in 3.4.

### 3.3 Device pairing through the relay, end to end encrypted

Group 10 as written says the QR carries "target settings, credentials and the unlock key sealed with a one-time key typed as ten words". For mobile I would change three things.

1. **Transfer the vault key and a target descriptor, not credentials.** A OneDrive refresh token copied to a second device is the token of a different "device" in Microsoft's eyes, and it still dies after 24 h. The phone should sign in to OneDrive itself (one tap), then receive the vault key from the paired device. Credentials stay out of the payload. The only exception is a pasted WebDAV or S3 secret, which the user already holds.
2. **Use a PAKE rather than "ten words sealing a blob".** One device shows a short secret (QR, or words to type). Both run a password-authenticated key exchange (CPace or SPAKE2) over the relay, so the relay and anyone watching it learn nothing offline-guessable, and a wrong guess gets one attempt. `@noble/curves` is already in the lockfile (ADR-0039 says so for `@noble/hashes`; I did not check the curve primitives needed for CPace, so confirm in the spike). Ten words sealing a blob would be safe only if the relay never sees the blob; with a PAKE the relay can carry the whole exchange.
3. **Add an optional data path.** Over the same channel (WebRTC data channel, with the relay as fallback, as the board mesh does), the two devices exchange manifests and send the missing sealed segments both ways. It is the one option that needs **no cloud account at all**, and it serves a desktop user on the folder adapter who also has an iPhone. It does not sync in the background; it syncs when both are open on the pairing screen. The relay stays memory-only and sees only ciphertext, in line with the hard rules (no server-side storage; nothing readable leaves the browser).

Whether the existing room protocol accepts a pairing rendezvous unchanged (envelope validation, `maxConnections`, the `sig` budget of 120 frames) needs a spike. If it needs a new frame type, that is a protocol change (`packages/protocol`) and needs the spec and an ADR note, since the design currently promises "no change to the relay or the protocol" (`design.md:209`). Camera scanning uses `BarcodeDetector` via `JoinScanner.vue`, which falls back to a typed code where unavailable; I did not verify Safari's `BarcodeDetector` support, so the typed words must remain a first-class path.

Effort: 6 to 8 d for the key-and-descriptor path with PAKE (10.1, 10.2 reshaped), plus 4 to 6 d for the data path.

### 3.4 Share sheet and file fallbacks (the sealed vault file)

- **Send**: `navigator.share({ files })` (guard with `navigator.canShare({ files })`). In iOS Safari this opens the share sheet with "Save to Files", AirDrop, Mail, and a OneDrive or Dropbox upload from their own apps. Search results are unclear about file sharing support in older Safari versions, so test it **[verify on device]**.
- **Receive**: `<input type="file">`. Web Share Target and file handling are not available in iOS Safari, so the user opens the app and picks the file (from Files, so iCloud Drive works).
- **Format**: a single `.rbv` file holding the same sealed objects (`info.json`, manifests, segments) as a vault, with a header and a final-chunk check. Nothing readable is ever written, which matches the ADR rule. Import is a put into the IDB target followed by the normal union, so it needs no new merge logic.
- **Why it matters beyond mobile**: it is the answer for iCloud users, the safety net for iOS storage eviction, and it overlaps with the "Backup export" of `export-destinations-v2` and the "Save a board file" proposal of `local-data-durability` (task 2.2). Build one sealed-file format and let those two reuse it, so there are not three formats.
- **Limits**: manual, not sync. A user must remember to export. The status chip should show "last backup" so the gap is visible.

Effort: 3 to 4 d (format and union import reuse the vault engine).

### 3.5 Installed PWA constraints on iOS

What the sources say, with confidence:

- **Eviction.** WebKit's rule since 2020 deletes script-writable storage of a site not used for seven days in Safari. Apple's clarification says home-screen web apps have their own days-of-use counter and are not held to the Safari timer (WebKit blog and its clarification in search results). A 2024 WebKit bug says sites that never touch another origin can still be hit; I found no confirmation that it was fixed. **Confidence: medium. Test an installed app that sits unused for more than 7 days on a real device.**
- **`navigator.storage.persist()`.** WebKit says grants are heuristic, for example for home-screen apps. A 2024 bug report says it always returned false in Safari 17, and a third-party guide says iOS always denies it. Sources conflict. Treat as unreliable and do not depend on a `true`. **[verify on device]**
- **Quota.** Same origin quota in a home-screen app as in the browser (WebKit storage policy post). One secondary source says 20% of disk per origin in Safari and 60% in a web app; the sources conflict and I did not rely on either. A vault of text is small either way.
- **Separate storage.** A home-screen app and Safari do not share storage on iOS (WebKit bug 181850 and others). A board opened in Safari is invisible to the installed app. The app should say so when a person installs it, and the pairing and file paths are the way to move data between the two.
- **No background work.** Background Sync and Periodic Background Sync are unsupported on iOS Safari (firt.dev compatibility table and Apple forum threads). Web Push exists for installed apps from iOS 16.4, but it needs a push service, which means a server of ours, so it is not an option. Sync runs only while a tab is open, exactly as ADR-0039 already says ("sync only runs while a tab is open").
- **No service worker today.** The app is a manifest only. A service worker would help offline load of the site on a phone, but it is not needed for sync and it conflicts with the hashed-assets rules (ADR-0032, 0034). I do not propose adding one here.
- **OAuth inside a standalone app.** Sign-in navigates the whole window away and back to `/storage/callback`. The design stores PKCE state in `sessionStorage`. In an iOS standalone app a cross-origin navigation may open in an in-app browser sheet; if the return lands in Safari instead of the app, `sessionStorage` is gone and the sign-in fails. I could not confirm this from search. **This is the first thing to test on a real iPhone, and it decides whether OneDrive works in an installed app at all.** The fallback is PKCE state in IndexedDB or `localStorage` rather than `sessionStorage`, plus a clear error.
- **Daily unlock.** With a 24 h token limit the password is asked every day on a phone. Typing a 12-plus character password on a phone each day will make users drop the feature. Open question 6 in the design should be answered "on" by default for phones, with the stated trade-off (an XSS could use the non-extractable key). It also needs a task of its own because the design says it is "settled here if cut from group 2".

## 4. Recommended ordered plan

Four steps, each its own PR group. Effort in engineer-days, owner effort listed separately.

| # | Step | Why this order | Effort | Owner |
|---|---|---|---|---|
| 0 | **Owner: register the Entra app, set `ONEDRIVE_CLIENT_ID`, run the live check on an iPhone (Safari tab and installed app) and an Android phone.** Finish 3.5. | Unblocks real mobile sync and settles the two biggest unknowns (the iOS redirect return, the upload hosts). | 0.5 d | about 30 min registration plus the check |
| 1 | **Mobile fixes to the shipped path:** PKCE state in a store that survives an app-switch, "Stay unlocked on this device" with a default for phones, a "Sign in again" flow that is one tap, feature-flag text for each mobile browser in the Sync section (replace "OneDrive later"). | The 24 h limit and the redirect are what a phone user meets first. | 2 to 3 d | none |
| 2 | **Sealed vault file** (`.rbv`) export and import with the share sheet and file input, "last backup" in the status chip; shared by `local-data-durability` 2.2 and `export-destinations-v2` backup. | Covers iCloud and no-account users, and is the eviction safety net. Cheap because it reuses the vault engine. | 3 to 4 d | none |
| 3 | **Pairing v2** (PAKE rendezvous over the relay): key and target descriptor first, then optional device-to-device segment exchange. | The only option with no account and no third party, and the best "second device" experience. Needs a relay and protocol spike. | 6 to 8 d, then 4 to 6 d | none |
| 4 | **More adapters, by phone value:** Dropbox (6), then WebDAV (7), then GitHub (4). Google Drive (5) only after its go or no-go spike. | Dropbox gives the longest-lived token. WebDAV serves self-hosters who already accept a CORS config. | 3 to 4 d, 5 to 6 d, 4 to 5 d | Dropbox registration and production approval |

If the owner wants one number: steps 0 to 3 are roughly **15 to 22 engineer-days** over about three weeks of calendar time, with step 0 first and the rest parallelisable after it.

## 5. Spec tasks to add (OpenSpec `user-drive-storage`, or a new change)

Add to `tasks.md`; titles are suggestions and must reuse the epic and sub-issue titles per the memory note "roadmap changes to open already have issues".

- **3.6 Mobile OneDrive fixes**: PKCE state survives an app-switch (move from `sessionStorage` to a sealed IndexedDB entry with a short expiry); one-tap "Sign in again"; verify on a real iPhone and Android phone and record in `docs/owner-checks.md`.
- **2.9 Stay unlocked on this device** (it is in design question 6 and in 10.2 "if cut from group 2"): non-extractable key in IndexedDB, explicit opt-in screen, a way to turn it off; verify unit tests and e2e.
- **2.10 Mobile browser matrix in the Sync section**: replace "OneDrive adapter later" with the real options per browser; verify e2e with feature detection stubbed (never a user-agent test).
- **11 (new group) Sealed vault file**: 11.1 `.rbv` format and a size limit; 11.2 export through `navigator.share` with a download fallback; 11.3 import through a file input with union and plaintext-guard tests; 11.4 "last backup" in the status chip and guide text. Cross-reference `local-data-durability` 2.2 and `export-destinations-v2`.
- **10.1 and 10.2 rewritten** (pairing): PAKE rendezvous (CPace or SPAKE2), attempt limit, 2-minute expiry, payload with vault key and target descriptor only; a spike task for whether the current room protocol carries it; 10.3 optional device-to-device segment exchange over the WebRTC channel with relay fallback; an ADR amendment if the protocol changes (the design says "no change to the relay or the protocol", `design.md:209`).
- **ADR-0039 addendum or new ADR**: the mobile matrix, the 24 h consequence on phones, the decision on token-exchange endpoints for Google (accept or refuse), and the sealed-file format as a second target-less path. Per `AGENTS.md`, do not rewrite an accepted ADR; add a new one that references it.
- **Docs**: `docs/user-guide/{fr,en}/sync.md` gains a "On a phone" section; `docs/owner-checks.md` gains the iOS installed-app and storage-eviction checks; `pnpm docs:tour && pnpm docs:guide` in the same PR.

## 6. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| OAuth redirect in an iOS installed app returns to Safari, not the app | OneDrive never works in the installed app | Step 0 test; PKCE state in IndexedDB; fallback to opening the app in Safari with a clear message |
| Daily sign-in and password on a phone | Users abandon sync | Stay unlocked (opt-in) and one-tap sign-in; Dropbox (long token) as the next adapter |
| Silent loss of boards on iOS from storage eviction | Lost board with no other copy, as in issue #365 | Installed app, `persist()` where granted, the "protected / may be cleared" row and "Save a board file" from `local-data-durability`, `.rbv` backup |
| Pairing needs a relay or protocol change | Breaks the "no change to the relay" promise and needs spec work | Spike first; keep the relay memory-only; add the ADR note |
| PAKE implemented by hand | Crypto error | Use a vetted implementation or the noble primitives with published test vectors; third-party review before release |
| Dropbox development-status cap and approval time | A launch limited to a small number of users until approved | Start approval early; make step 4 order flexible |
| Google Drive route depends on a deprecated-looking flow or a secret | Dead end or a trust change | Keep it behind its own go or no-go spike; no secrets in the browser |
| OneDrive hosts or CORS differ from the spike's assumptions | Adapter fails live | The owner's live check (already listed in ADR-0039) |
| Sources for iOS behaviour are secondary and sometimes conflicting | Wrong assumption in the design | Every **[verify on device]** item becomes a task with a recorded result on a real device |

## 7. What the owner must register

| Provider | What to create | Result to hand to the project | Cost and notes |
|---|---|---|---|
| **Microsoft (OneDrive)** | Entra app registration, SPA platform, audience "any directory and personal accounts", delegated `Files.ReadWrite.AppFolder` and `offline_access`, remove `User.Read`, no secret, redirect URIs for the production host, `localhost:8787` and `localhost:3000`, manifest `requestedAccessTokenVersion: 2` | Application (client) id into `ONEDRIVE_CLIENT_ID` | Free. The full list is in `docs/storage-onedrive.md`. Preview hosts need their own redirect URI |
| **Dropbox** | App Console app: scoped access, App folder, scopes `files.content.read` and `files.content.write`, redirect URIs | App key (public) into a new `DROPBOX_APP_KEY` setting | Free. Request production approval before launch; the development user cap could not be confirmed |
| **Google** (only if the spike is a go) | Cloud project, Drive API enabled, OAuth consent screen in production with privacy and terms URLs and a verified domain, a web client with redirect URIs | Client id (and a secret only if a Worker token endpoint is accepted) | Free; verification time for the consent screen |
| **GitHub, WebDAV, S3, generic HTTP** | Nothing. The user supplies a token, URL or key | none | none |
| **Apple** | Nothing, and nothing planned. iCloud has no browser API that fits the CSP | none | CloudKit JS would need a paid Apple Developer account and a third-party script, so it is rejected |
| **Device checks** | An iPhone (installed app and Safari tab), an Android phone, one Outlook account, and a week of an unused installed app for the eviction test | Results recorded in `docs/owner-checks.md` | The same items as step 0 |

Everything in this table that is a client id or an app key is public by design. Nothing needs to be a Worker secret unless the Google token endpoint is chosen.

## 8. Open questions for the owner (decide before step 3)

1. Is a manual file (step 2) acceptable as the iCloud answer, or is it a priority to find a browser-native iCloud route? I found none that fits the CSP.
2. May the pairing path change the relay protocol (new frame type), or must it fit the existing room and signalling frames?
3. Stay unlocked on this device: default on for phones, yes or no?
4. Is Google Drive worth a Worker token endpoint, given it breaks the "tokens never leave the browser" statement for that one provider?

## 9. Sources used (web, not independently verified beyond reading the results)

- WebKit, "Updates to Storage Policy": <https://webkit.org/?p=14403>
- WebKit bug 237350 (home-screen web app storage) and bug 271401 (`persist()` returns false): <https://bugs.webkit.org/show_bug.cgi?id=271401>
- MDN storage quotas and eviction: <https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria>
- firt.dev iOS PWA compatibility table: <https://firt.dev/notes/pwa-ios/>
- Apple developer forum threads on Background Sync and PWA push: <https://developer.apple.com/forums/thread/694805>
- WebKit, "The File System API with Origin Private File System": <https://webkit.org/?p=12257>
- caniuse, File System Access API: <https://caniuse.com/native-filesystem-api>
- Google, OAuth 2.0 for client-side web applications: <https://developers.google.com/accounts/docs/OAuth2UserAgent>
- Third-party write-up on Google and PKCE client secrets (secondary, unconfirmed): <https://ktaka.blog.ccmp.jp/2025/07/oogle-oauth2-and-pkce-understanding.html>
- Dropbox OAuth guide and PKCE article: <https://developers.dropbox.com/oauth-guide>, <https://dropbox.tech/developers/pkce--what-and-why->
- Nextcloud forum and issues on WebDAV CORS: <https://github.com/nextcloud/server/issues/3131>
- GitHub contents API limits: <https://github.blog/changelog/2022-05-03-increased-file-size-limit-when-retrieving-file-contents-via-rest-api>

Not found by search, so stated as unknown above: the Dropbox development-status user cap, Safari support of `BarcodeDetector`, GitHub's CORS and secondary limit numbers, and whether iOS standalone apps return an OAuth redirect into the app.
