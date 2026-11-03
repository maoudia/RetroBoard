# Proposal

## Why
Owner feedback 2026-11-03: export to GitHub or GitLab (encrypted or not), to any drive as a backup, to SQLite, with better icons, and export of user settings. Extends `export-hub` (which stays the base panel).

## What Changes
- Push-free destinations first: a "Repository" export produces a Markdown or JSON file (optionally encrypted) plus a ready-to-run `git` or `gh` snippet; direct API push is optional and uses a token the user pastes and that is kept in memory only.
- "Backup" export to a file the user saves in any drive folder (see `user-drive-storage` for automatic sync).
- SQLite export: a `.sqlite` file with tables for board, columns, notes, votes, actions, built in the browser (WASM from 'self', lazy loaded).
- User settings export and import (JSON, optionally encrypted with a passphrase).
- New file-type icons per destination in the export panel.

## Capabilities
### New Capabilities
<!-- none -->
### Modified Capabilities
- `export`: repository, backup, SQLite, settings export, icons.

## Impact
`packages/exporters` (pure functions, snapshot tests), export panel, lazy WASM asset (size budget check), license check of the SQLite library (permissive only). No relay change; tokens never persisted nor sent to us. Spec only for now.
