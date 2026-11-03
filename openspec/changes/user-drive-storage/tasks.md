# Tasks

## 1. Foundations
- [ ] 1.1 ADR and `StoragePort` with an in-memory fake; verify unit tests of merge by union and encryption round trip
- [ ] 1.2 Local folder adapter (File System Access API, handle in IndexedDB, atomic write); verify e2e in Chromium and fallback in other browsers

## 2. Product
- [ ] 2.1 Storage preference UI (connect, status, last sync, disconnect and forget) with fr and en; verify e2e and axe
- [ ] 2.2 Automatic save of boards and settings and restore on a new browser; verify e2e with two profiles sharing a folder
- [ ] 2.3 Obsidian and Joplin readable Markdown mode (explicit per board); verify unit tests and e2e

## 3. Later
- [ ] 3.1 Google Drive appData adapter (needs maintainer decision on CSP and OAuth client)
