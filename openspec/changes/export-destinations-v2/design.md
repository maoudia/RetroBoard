# Design

## Decisions
- Encryption of exported files reuses the crypto package with a user passphrase (AES-GCM, PBKDF2 or Argon2 per ADR on keys); the file header states the format version.
- No OAuth: repository push uses a fine-grained token pasted by the user, held in memory, requests only to api.github.com or the GitLab host the user names; each origin needs a CSP `connect-src` entry added by a maintainer (not an agent change to workflows).
- SQLite: sql.js style WASM served from 'self'; schema documented and versioned next to the JSON Schema.
