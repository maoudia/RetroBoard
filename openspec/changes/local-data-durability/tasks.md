# Tasks

## 1. Sealed drafts

- [ ] 1.1 `stores/drafts.ts`: read and write through `createLocalSealer()`, migrate clear entries on first load, memory only when IndexedDB is missing; verify unit tests (sealed at rest, migration, private mode)
- [ ] 1.2 Retention: `ports.client.ts` sweep removes `retroboard:drafts:<room>` and `retroboard:compose:<room>` for purged rooms (`purge` returns the room ids); verify a unit test with a fake clock
- [ ] 1.3 Privacy page sentence on drafts (fr/en); verify `pnpm verify`

## 2. Persistence shown

- [ ] 2.1 Settings store keeps `navigator.storage.persisted()`; profile row "Boards on this device: protected / may be cleared by the browser" (fr/en); verify e2e with the API stubbed both ways and axe
- [ ] 2.2 One-time proposal "Save a board file" when the board has no other ready holder and persistence is refused; verify e2e and that it never shows twice for a board
- [ ] 2.3 User guide chapter on keeping boards, `pnpm docs:tour && pnpm docs:guide`; verify `pnpm verify`
