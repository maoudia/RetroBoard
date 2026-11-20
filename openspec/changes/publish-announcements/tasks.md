# Tasks

## 1. Setting and batching

- [ ] 1.1 `announcePublish` in the domain next to `announceArrivals` (`settings`, `board.init`, `settings.update`, snapshot, clone, team share defaults), additive and optional with the protocol compatibility test; verify unit tests of the handlers, that an older snapshot without the key reads as OFF, and `pnpm arch`
- [ ] 1.2 Read model `publishBatches` in `packages/application/src/read-models/` (group by author and column inside a 3 s window, a summary beyond three authors, anonymous author handling, live events only); verify unit tests with a fake clock including the autoPublish burst of 12 people and a replayed log that yields nothing

## 2. Toast and feed

- [ ] 2.1 Toast through `ToastHost.vue` and an `ActivityEntry` kind `published` listed always, fr and en keys with plural forms ("Alex published 4 ideas to Wish List", "Alex published 1 idea to Wish List", the summary line), no idea text in either; verify unit tests of the labels, e2e with two contexts (toast on, toast off but feed entry kept, presenter mode silent) and axe
- [ ] 2.2 Setting in the creation form (advanced mode), in `OptionsDialog.vue` for facilitators, and the personal default in Profile with the synced settings list test; simple mode applies the personal default silently; verify e2e (create with the toggle, change later, personal default starts the form on ON) and the pseudo-locale overflow check

## 3. Guide

- [ ] 3.1 Guide step "See who published" in the Write chapter (fr and en), manifest updated, `pnpm docs:tour && pnpm docs:guide`; verify `pnpm docs:check`
