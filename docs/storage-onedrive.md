# Sync with OneDrive

Change `user-drive-storage`, group 3 ([ADR-0039](adr/0039-sync-boards-and-settings-as-encrypted-immutable-objects-on-a.md), design in `openspec/changes/user-drive-storage/design.md`). In Preferences > Sync a person presses **Sign in with Microsoft** with an Outlook, Hotmail or Live account, and RetroBoard keeps its encrypted vault in its own OneDrive app folder, `Apps/RetroBoard`. It is for phones and for browsers without the folder picker (Safari, Firefox, Chrome on Android); the folder path stays the choice of anyone who prefers their own sync client.

## What it does, and what it does not

- **Personal Microsoft accounts only.** The app folder and its narrow permission (`Files.ReadWrite.AppFolder`) exist for personal accounts; the spike of task 3.1 found no support for work or school accounts. A work or school user uses "Sync with a folder" with their OneDrive sync client. The only API route for them would be a scope that reaches all their files, which is refused.
- **The least privilege.** The app asks for `Files.ReadWrite.AppFolder` and `offline_access` and nothing else (no `openid`, no `User.Read`). A stolen token reaches the ciphertext of this app and nothing else in the OneDrive.
- **Everything is sealed in the browser first.** The adapter moves bytes the vault layer has already encrypted. Microsoft sees the account it already knows, the number and rounded size of the objects, their times, and the number of devices.
- **A daily sign-in.** Microsoft ends the refresh token of a single-page application **24 hours after the interactive sign-in**, whatever was renewed since, so every device is sent through the sign-in about once a day, an active one included. The status says "Sign in again", one click redirects (silent while the Microsoft session is alive), and because the vault key lives in memory only, the password is asked again after the redirect.
- **No revocation by the app.** Microsoft offers an app no way to revoke its own refresh token. "Disconnect and forget" deletes the token and the keys from the browser and can delete the vault files; the app stays listed at <https://account.microsoft.com/privacy/app-access> until the person removes it there, and a token copied earlier would work for 24 hours at most.

## How it is built

| Piece | Where |
|---|---|
| Graph adapter (`SyncTargetPort` over `/me/drive/special/approot`) | `apps/web/app/adapters/sync/onedrive-graph.ts` |
| Token endpoint (code and refresh, in the worker's memory) | `onedrive-auth.ts` |
| The worker, its messages and the page-side proxy | `workers/onedrive.ts`, `onedrive-worker-core.ts`, `onedrive-protocol.ts`, `onedrive-client.ts` |
| Sign-in (PKCE, authorize URL, pending state in `sessionStorage`), token at rest (sealed in IndexedDB) | `oauth-pkce.ts`, `token-store.ts`, `onedrive-session.ts` |
| Callback page | `apps/web/app/pages/storage/callback.vue` (`/storage/callback`) |
| Worker script policy, `/providers.json` | `apps/relay/src/core/headers.ts` (`SYNC_WORKER_ORIGINS`), `providers.ts` |
| Fake Microsoft identity and Graph | `packages/testkit/src/fake-graph.ts`, `tests/e2e/support/fake-graph-server.ts` |

The page runs no network code for OneDrive. `/sync/onedrive.js` is a worker built by `apps/web/scripts/build-sync-workers.mjs` (part of `pnpm generate` and `pnpm dev`, not committed) and served by the Worker with its own Content-Security-Policy, `default-src 'none'; connect-src https://login.microsoftonline.com https://graph.microsoft.com https://*.up.1drv.com https://*.files.1drv.com`. A dedicated worker takes the policy of its own script response, so these origins exist inside the worker only, the page policy is byte-identical to a deployment without OneDrive, and a person who never connects never loads the script. The honest limit is the one of ADR-0033: script injected in the page could start the worker, so the strict `script-src` stays the defence.

Graph behaviour the adapter relies on: a read goes through the item's pre-authenticated download URL without credentials (a browser cannot send `Authorization` across the 302 of `.../content`); a conditional write (`If-Match`, create-only) goes through an upload session, the one place Microsoft documents both preconditions; fragments are a multiple of 320 KiB and carry no `Authorization`; throttling (429, 503, 509) honours `Retry-After` and otherwise backs off; at most 3 requests are in flight.

## What the maintainer creates in Microsoft Entra

One time, by the maintainer, with no client secret. End users never do this.

1. Sign in at <https://entra.microsoft.com> with an account that owns a tenant (a free tenant is enough; a personal Microsoft account can create one through a free Azure sign-up).
2. Entra ID > App registrations > New registration. Name: **`RetroBoard`**: it is the folder name people see, `Apps/RetroBoard`, and it is fixed at first use, so choose it before the first sign-in. Supported account types: **Accounts in any organizational directory and personal Microsoft accounts** (`signInAudience` `AzureADandPersonalMicrosoftAccount`). Work accounts cannot use the app folder in v1, but personal accounts need this value, and it lets work accounts be added later without a new registration.
3. Redirect URI, platform **Single-page application** (not Web, not Mobile and desktop: only the single-page platform answers CORS on the token endpoint): `https://<production host>/storage/callback`. Under the same platform add `http://localhost:8787/storage/callback` (`pnpm dev:worker`) and `http://localhost:3000/storage/callback` (the Nuxt dev server). Preview hosts (`*.workers.dev`) cannot be wildcarded: sign-in does not work on a preview unless its host is added by hand.
4. Authentication: leave "Allow public client flows" off, tick no implicit grant box, set no front-channel logout URL.
5. API permissions > Add a permission > Microsoft Graph > **Delegated**: `Files.ReadWrite.AppFolder` and `offline_access`. **Remove `User.Read`**, which the portal adds by default. Add neither `openid` nor `profile`, and never `Files.ReadWrite` or `Files.ReadWrite.All`. None needs admin consent.
6. Certificates and secrets: create nothing.
7. Manifest: check `"signInAudience": "AzureADandPersonalMicrosoftAccount"` and `"requestedAccessTokenVersion": 2` (Microsoft requires 2 for this audience; set it if the portal left it empty).
8. Branding and properties: name, logo, home page URL, privacy statement URL (`/privacy`), terms of service URL (`/terms`). Publisher verification is optional for personal accounts and only matters if work accounts are ever added.
9. Copy the **Application (client) ID**, a GUID, public by design, and set it as the Worker setting `ONEDRIVE_CLIENT_ID` (see below). Nothing else is secret and nothing is stored on our side.

## Configuration

The client id is read at run time from `/providers.json`, which the Worker (or the Node adapter) builds from its setting, because the site is static and a self-hosted image is not rebuilt per deployment:

| Setting | Meaning |
|---|---|
| `ONEDRIVE_CLIENT_ID` | The public client id of the registration. In `wrangler.jsonc` `vars` for the hosted deployment, an environment variable for the container. Empty (the default), or not a GUID: OneDrive is not offered and the Sync section shows the folder only. |
| `NUXT_PUBLIC_ONEDRIVE_CLIENT_ID` | The same value at build time (`pnpm generate`), used only when the Worker serves none. |

A self-hosted deployment registers its own app with its own host (steps 1 to 9, with its own redirect URI) and sets `ONEDRIVE_CLIENT_ID`; see [self-hosting](self-hosting.md).

## Testing without Microsoft

No test calls a real Microsoft endpoint. `createFakeGraph()` in `packages/testkit` implements the authorize and token endpoints and the slice of Graph the adapter uses (children with paging, item metadata with the download URL, simple upload, upload sessions, delete, throttling, expiry, quota, one app folder per account). The adapter passes the contract suite against it in three modes (conditional writes through sessions, through a simple `PUT`, and against a provider whose simple `PUT` ignores the preconditions) and through the worker's message channel; the plaintext guard covers its URLs and bodies. The e2e harness runs the fake on a port (`tests/e2e/support/fake-graph-server.ts`, started by `playwright.config.ts`), the Worker is started with `ONEDRIVE_CLIENT_ID` and `FAKE_PROVIDER_ORIGINS`, and `/providers.json` points the endpoints at the fake. `FAKE_PROVIDER_ORIGINS` adds an origin to the policy of the provider worker scripts only; it is never set in production.

## What only a real account proves (the owner's live check)

Listed in [owner-checks](owner-checks.md). With one Entra registration and one Outlook account, from a browser:

1. **Upload host CORS.** `POST .../createUploadSession` from the worker with `Authorization`; note the `uploadUrl` host (is it under `*.up.1drv.com`?); `PUT` a fragment without `Authorization` and read the CORS response headers.
2. **Download host CORS (the one that matters most).** Read an item's `@microsoft.graph.downloadUrl` and fetch it from the worker with no credentials: is `Access-Control-Allow-Origin` present, and is the host under `*.files.1drv.com`? If not, a browser-only app cannot read files and OneDrive needs another design.
3. **Simple `PUT` preconditions.** `PUT .../content` with a stale `If-Match` (expect 412) and with `@microsoft.graph.conflictBehavior=fail` on an existing name (expect 409). If both hold, set the adapter's `conditional` mode to `'simple'` to save a request per segment.
4. **Parent folders.** A `PUT` to a path whose folders do not exist: created, or not? (The adapter creates them itself if not.)
5. **Throttling headers.** Is `Retry-After` readable from a browser on a 429? (Without it the adapter backs off by itself.)
6. **24 hours.** Sign in, wait a day, refresh with the stored token (expect `invalid_grant`), then "Sign in again": silent in Chrome, Safari and Firefox with an active Microsoft session?
7. **Work account (optional).** The same registration with a work or school account of a free Microsoft 365 developer tenant: `GET /me/drive/special/approot` is expected to fail, which settles the documentation conflict.
8. **Consent and revocation.** The text of the consent screen for `Files.ReadWrite.AppFolder`, the entry of the app at <https://account.microsoft.com/privacy/app-access> after consent, and that removing it there makes the next sign-in ask again.
