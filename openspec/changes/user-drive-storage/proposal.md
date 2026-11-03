# Proposal

## Why
Owner feedback 2026-11-03 (very important for adoption): persist boards and settings on the user's own drives (Google Drive, iCloud, Joplin, Obsidian), encrypted, when the user opts in. The product keeps its rule: no server-side storage, nothing readable leaves the browser.

## What Changes
- Opt-in "Storage" preference with providers as adapters behind one port: **Local folder** (File System Access API; works with the Google Drive, iCloud Drive, OneDrive and Dropbox desktop sync folders, and with Obsidian vaults and Joplin sync folders), then optional cloud APIs (Google Drive appData scope) in a later step.
- Everything written is encrypted client-side (board key derived from user secret; the provider only sees opaque files named by hash).
- Settings and boards sync both ways with conflict resolution through the event ledger merge (append-only, so merging two copies is a union).
- Obsidian and Joplin: an additional readable, unencrypted Markdown export mode, explicitly chosen per board.
- Clear status, last sync time, and "disconnect and forget".

## Capabilities
### New Capabilities
- `user-storage`: opt-in encrypted persistence of boards and settings in user-owned storage.
### Modified Capabilities
<!-- none -->

## Impact
New `StoragePort` in application, adapters in apps/web, preference UI, ADR (storage adapters, keys, conflict model). File System Access API is Chromium only: Safari and Firefox fall back to import and export files. No relay change. Spec only for now.
