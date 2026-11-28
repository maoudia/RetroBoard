# Tasks

## 1. Sealed drafts

- [x] 1.1 `stores/drafts.ts`: read and write through `createLocalSealer()`, migrate clear entries on first load, memory only when IndexedDB is missing; verify unit tests (sealed at rest, migration, private mode)
- [x] 1.2 Retention: `ports.client.ts` sweep removes `retroboard:drafts:<room>` and `retroboard:compose:<room>` for purged rooms (`purge` returns the room ids); verify a unit test with a fake clock
- [x] 1.3 Privacy page sentence on drafts (fr/en); verify `pnpm verify`

## 2. Persistence shown

- [x] 2.1 A device-only `persistence` store (not the synced settings) keeps the answer of `navigator.storage.persist()`; profile row "Boards on this device: protected / may be cleared by the browser" (fr/en); verify e2e with the API stubbed both ways and axe
- [x] 2.2 One-time proposal "Save a board file" when the board has no other ready holder and persistence is refused; verify e2e and that it never shows twice for a board
- [x] 2.3 User guide chapter on keeping boards, `pnpm docs:tour && pnpm docs:guide`; verify `pnpm verify`
