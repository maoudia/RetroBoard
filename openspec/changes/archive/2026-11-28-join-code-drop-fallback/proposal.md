# Proposal

## Why

Split from `join-code-committed-sas` (task 2.3, 2026-11-11). That change keeps the plain `knock` as a fallback for one release so old and new clients interoperate. The fallback is the weak path (no committed number), so it is removed one release later, in a separate pull request.

## What Changes

- The joiner no longer falls back to a plain `knock` when no `challenge` arrives; the holder no longer accepts a plain `knock` nor shows the "not verified" label.
- Only the committed exchange (`knock2`, `challenge`, `reveal`) remains.

Out of scope: longer codes, a password-authenticated exchange, changes to invitation links.

Bounded contexts: Access. Relay traffic: unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `room-access`: join by code accepts only the committed exchange.

## Impact

- `apps/web/app/utils/join-code.ts`, `apps/web/app/utils/join-flow.ts`, the knock list "not verified" label, i18n fr/en. Planned for the release after the one that ships `join-code-committed-sas` (R2).
