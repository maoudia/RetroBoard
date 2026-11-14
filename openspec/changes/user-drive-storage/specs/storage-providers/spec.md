# storage-providers Specification

## Purpose
What each storage adapter must do, how a provider's origin is allowed under the strict CSP, and what the user has to set up.

## ADDED Requirements

### Requirement: Origins only after opt-in
The page content security policy SHALL NOT gain an origin for a storage provider, and the folder adapter SHALL need none. A network adapter SHALL run in a dedicated worker served from a fixed script URL whose own response carries a policy that allows only that provider's origins, and the script SHALL be loaded only after the user chooses the provider. Keys and plaintext SHALL NOT enter that worker. The local folder and the browser storage SHALL need no policy change.

#### Scenario: Page policy unchanged
- **WHEN** the landing, setup, boards and board pages are used with no provider connected
- **THEN** the page policy has no storage origin and the browser reports no policy violation

#### Scenario: Provider worker policy
- **WHEN** a user chooses OneDrive
- **THEN** the worker script is served with a policy whose `connect-src` lists the Microsoft sign-in and Graph origins and nothing else

#### Scenario: Unsupported browser
- **WHEN** a browser applies the page policy to worker requests
- **THEN** the provider is reported as unavailable in that browser and the application keeps working on its local data

### Requirement: Least-privilege access
A provider adapter SHALL request only the narrowest scope that reaches the application's own folder or repository, and SHALL refuse broader access. Tokens, credentials and directory handles SHALL stay in the browser, sealed with the device key, and SHALL NOT be sent anywhere but the provider.

#### Scenario: Scope
- **WHEN** a user signs in with Microsoft
- **THEN** the requested scopes are `Files.ReadWrite.AppFolder` and `offline_access` and nothing else

#### Scenario: Stolen token
- **WHEN** an access token is copied
- **THEN** it reaches only the application's folder, which holds ciphertext

### Requirement: OneDrive adapter
The OneDrive adapter SHALL use Microsoft Graph with OAuth 2.0 authorization code and PKCE as a single-page application, store the vault under the application folder, honour the `eTag` with `If-Match`, create objects only when absent, upload objects above 4 MiB through a resumable upload session, and retry throttled requests (429, 503, 509) according to `Retry-After`.

#### Scenario: Concurrent update
- **WHEN** two devices update `info.json` at the same time
- **THEN** one write fails its `If-Match`, re-reads, merges and writes again

#### Scenario: Throttled
- **WHEN** Graph answers 429 with `Retry-After`
- **THEN** the adapter waits that long, backs off with jitter on repeats and never loses a local change

#### Scenario: Large object
- **WHEN** an object is larger than 4 MiB
- **THEN** it is uploaded in fragments through an upload session and resumes after an interruption

#### Scenario: Sign in again
- **WHEN** the refresh token is no longer valid
- **THEN** the status becomes "Sign in again" and the user restores sync with one redirect

#### Scenario: Accounts
- **WHEN** a work or school account cannot use the application folder
- **THEN** the application tells that user to use the local folder path instead of requesting broader access

### Requirement: Maintainer setup is documented
The documentation SHALL list, as a step list, what the maintainer creates for each provider (Microsoft Entra: a multitenant and personal-account application with the single-page application platform, redirect URIs for the hosted site and localhost, the delegated permissions, no client secret, the public client id as configuration), and a self-hosted deployment SHALL be able to use its own registration.

#### Scenario: Entra steps
- **WHEN** the maintainer follows `docs/storage-onedrive.md`
- **THEN** they obtain a client id with no secret and know which redirect URIs to add

### Requirement: Local folder adapter
The local folder adapter SHALL let a Chromium desktop user pick a folder, keep its handle in IndexedDB, and write each object so that a partial file is never visible (swap file replaced on close, then a size check). It SHALL be documented as the zero-setup path for the OneDrive, Google Drive, Dropbox, iCloud, Syncthing and Nextcloud sync folders.

#### Scenario: Synced folder
- **WHEN** a user picks a folder that their OneDrive desktop client syncs
- **THEN** encrypted objects appear there and the desktop client uploads them

#### Scenario: Permission to grant again
- **WHEN** the browser does not keep the folder permission across sessions
- **THEN** the status asks for one click, edits wait locally, and sync resumes after the click without losing anything

#### Scenario: Folder moved or deleted
- **WHEN** the chosen folder no longer exists
- **THEN** the status says "Folder not found, choose it again" and choosing it again keeps the same vault

#### Scenario: Browser without the API
- **WHEN** the browser has no File System Access API
- **THEN** the folder option is not offered, by feature detection and not by user agent

### Requirement: Tolerating the user's sync client
The folder adapter SHALL read only file names that match the vault patterns and ignore all others without deleting them, including temporary names and conflict copies, and SHALL treat a zero-byte, truncated or placeholder file as not ready and retry it later.

#### Scenario: Conflict copy
- **WHEN** a sync client leaves `name (conflicted copy)` or `name.sync-conflict-...` beside a segment
- **THEN** the application ignores the copy and loses no data

#### Scenario: Conflict copy of info.json
- **WHEN** two devices change `info.json` at once and the sync client keeps both
- **THEN** the engine merges them per property, writes the merged file and removes only the recognised copy

#### Scenario: Half-synced file
- **WHEN** a segment is zero bytes or truncated because the sync client has not finished
- **THEN** it is skipped and retried on a later pass, nothing is deleted, and after 24 hours the status says it is waiting for a file from the sync client

### Requirement: Names safe on every file system
The folder adapter SHALL use only lowercase ASCII names of at most 64 characters, free of reserved Windows names, so no two names collide on a case-insensitive file system or a cloud client.

#### Scenario: Case-insensitive collision
- **WHEN** two objects would differ only by letter case
- **THEN** that cannot happen, because every name is lowercase and derived from keyed hashes and counters

### Requirement: Other adapters
Each further adapter (OneDrive first, then GitHub, Google Drive, Dropbox, WebDAV, S3-compatible, generic HTTP) SHALL pass the contract suite, state its capability record, document what its provider requires (registration, CORS, token type, limits) and what the user must set up, and SHALL be added to the worker policy table with only its own origins, user-typed origins sharing one worker with credentials pinned to the origin they were entered for.

#### Scenario: GitHub repository must be private
- **WHEN** a user connects a GitHub repository
- **THEN** the adapter checks that the repository is private at connect and at the start of every session, refuses a public one and stops sync if it turns public

#### Scenario: Server without CORS
- **WHEN** a WebDAV or S3 server does not answer the browser's preflight
- **THEN** the connect check explains in plain words what the server must allow

#### Scenario: Generic HTTP profile
- **WHEN** a store implements the published profile (GET, PUT, DELETE and a prefix listing)
- **THEN** it works as a target without further code
