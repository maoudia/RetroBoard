# Design

## Decisions
- Folder sync first: zero OAuth, zero secrets on our side, works with every drive that has a desktop client. Cloud APIs only when a provider offers a browser-safe scope; tokens in memory or encrypted in IndexedDB with a user passphrase.
- Format: one encrypted file per board (`<hash>.rbx`), one for settings; header with version; content is the signed ledger, so merge = union by event id.
- Handle persistence: store the directory handle in IndexedDB; re-ask permission when the browser requires it.
- Strict CSP: no new origin for the folder mode.
- Risks: partial writes (write temp then rename), multiple devices writing at once (ledger union resolves), secret loss (documented, no recovery).
