# Proposal

## Why

The service stores nothing, so the participant's browser is the only durable copy.

- `apps/web/app/plugins/ports.client.ts:49` calls `requestPersistence()` and discards the answer. Retention defaults to "for ever" and the spec says a board is never lost because a tab was closed, but a browser may clear storage that is not persistent (Safari clears script-written storage of sites left unused; issue #365 was a lost board).
- Drafts and the text being typed are written in clear to localStorage (`apps/web/app/stores/drafts.ts:19,27`), under keys that contain the room id, and the retention sweep (`ports.client.ts:41-48`) never removes them. Board titles and links in the same browser are sealed (`stores/recents.ts`), drafts are the most private content and are not.

## What Changes

- The profile shows whether this device protects its boards or may clear them, and a board with no other holder and no export proposes "Save a board file" once.
- Drafts and composer text are sealed with the device key (`adapters/device-key.ts`), migrated on first read, and removed by the retention sweep with their board.

Out of scope: syncing drafts, server backup, changing the retention default.

Bounded contexts: Ideation (drafts), Board session (replica). Relay traffic: none.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `notes`: drafts at rest.
- `board-replication`: persistence state shown, drafts follow retention.

## Impact

- `apps/web/app/stores/drafts.ts`, `apps/web/app/plugins/ports.client.ts`, `apps/web/app/adapters/replica-idb.ts`, `ProfileDialog.vue`, i18n fr/en, privacy page.
