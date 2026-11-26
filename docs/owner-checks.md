# Owner checks

Manual checks only the owner can run. They were moved out of their OpenSpec changes so that the changes could be
archived and the work-in-progress count (`pnpm wip`) stays honest. They are **moved, not completed**: nothing here is
ticked until the owner has run the check. Tick a box in the pull request that records the result, and comment on the epic.

Linked from the [roadmap](roadmap.md) (R1 and R2).

## R1

- [ ] `reliable-board-sync` 4.3: Owner field re-test on real devices (different networks, one phone on mobile data); verify owner sign-off comment on the epic issue.
  Epic: [#169](https://github.com/maoudia/RetroBoard/issues/169). Archived change: `openspec/changes/archive/2026-11-12-reliable-board-sync/`.

## R2

- [ ] `p2p-presence-and-cursors` 4.2: Production check of link success rates behind corporate networks (manual, documented in docs/capacity.md).
  Epic: [#35](https://github.com/maoudia/RetroBoard/issues/35). Archived change: `openspec/changes/archive/2026-11-12-p2p-presence-and-cursors/`.
- [ ] `webmcp-browser-agents` 4.1: Origin trial token served as a Worker response header when configured (env var), documented in docs/webmcp.md with a manual test in Chrome; implemented (tokens in wrangler vars, header served, unit tested, docs/webmcp.md), pending the owner manual test in Chrome and sign-off.
  Epic: [#105](https://github.com/maoudia/RetroBoard/issues/105). Archived change: `openspec/changes/archive/2026-11-12-webmcp-browser-agents/`.
- [ ] `user-drive-storage` 2.7: Live check of folder sync on two real machines. In Chrome or Edge on the first machine, open Preferences > Sync, choose a folder that your own sync client already carries (OneDrive, Dropbox, Google Drive, iCloud, Syncthing or Nextcloud), create the vault, store the recovery key, tick both boxes and see "Synced". On a second machine wait until the sync client has brought the `RetroBoard` folder, open Preferences > Sync, choose the same folder, type the password and see the library appear within a minute. Open a board and see its notes, change a setting on one machine and see it on the other, make one edit on each machine while the sync client is paused, then resume it and see both on both. Also check once that choosing the folder again after moving it asks for the same vault, and that "Allow folder access" appears after restarting the browser when it does not keep the permission. The automated tests cover the engine, the adapter on a fake directory handle and the folder on the origin private file system with the picker stubbed; only a real picker and a real sync client prove the rest.
  Epic: [#429](https://github.com/maoudia/RetroBoard/issues/429). Change: `openspec/changes/user-drive-storage/`.
- [ ] `user-drive-storage` 3.5: Live check of sync with OneDrive, with one Entra registration (docs/storage-onedrive.md, "What the maintainer creates in Microsoft Entra") and one Outlook account. Set `ONEDRIVE_CLIENT_ID` (`wrangler.jsonc` `vars`, or `NUXT_PUBLIC_ONEDRIVE_CLIENT_ID` at build time), open Preferences > Sync on the hosted site (or `pnpm dev:worker` with the redirect URI registered), press "Sign in with Microsoft", create the vault, store the recovery key, tick both boxes and see "Synced" and the `Apps/RetroBoard` folder in OneDrive. In a second browser (a phone if you can) sign in with the same account, type the password, see the library, open a board and see its notes. Then the points the fake cannot prove, listed in docs/storage-onedrive.md ("What only a real account proves"): the CORS headers and the hosts of the upload and the download URLs (the download one decides whether a browser can read files at all), whether a simple `PUT` honours `If-Match` and `conflictBehavior=fail` (then switch the adapter to `conditional: 'simple'`), parent folders created on demand, `Retry-After` readable on a 429, the sign-in expiring after 24 hours and "Sign in again" renewing it silently, and removing the app at https://account.microsoft.com/privacy/app-access. Optional: the same with a work or school account (expected to fail on the app folder). Automated tests cover the adapter, the worker, the sign-in and the screens against a fake Microsoft; only a real account proves the rest. Record what you saw here.
  Epic: [#429](https://github.com/maoudia/RetroBoard/issues/429). Change: `openspec/changes/user-drive-storage/`.
- [ ] `export-hub` 3.2: One delivery of the Slack webhook to a real Slack workspace from the browser (needs a live incoming-webhook URL; paste it in the export panel, press send, see the message in the channel). The CORS and CSP path is already checked in Chromium and documented in docs/integrations.md; the clipboard stays the default if Slack refuses the browser call. Record the result in docs/integrations.md.
  Archived change: `openspec/changes/archive/2026-11-26-export-hub/`.
- [ ] `publishing-ux-redesign` 2.3: Sign-off of the 5-step publish scenario. The scenario is recorded as a Playwright trace by `tests/e2e/publish-scenario.spec.ts`; review the trace and leave a sign-off comment on the pull request or the epic.
  Archived change: `openspec/changes/archive/2026-11-26-publishing-ux-redesign/`.
