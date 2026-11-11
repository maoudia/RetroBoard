# Tasks

## 1. Refuse imitations

- [x] 1.1 `join-flow.ts` `createJoinHost`: a knock whose number equals a pending one removes both and sets `state.imitation = true`; verify unit tests in `apps/web/test/` (two knocks, same number, different nonce)
- [x] 1.2 Knock list: warning text and icon (fr/en), cleared when a new code is shown; verify `join-code.spec.ts` (the warning is a `role="alert"` paragraph in the text colour, so axe on the existing dialog is unchanged)

## 2. Committed number

- [x] 2.1 `design.md`: messages `knock2` (commitment), `challenge` (holder value), `reveal` (key), number = digits of SHA-256(key, holder value, nonce); what the relay observes; why 6 digits are enough once committed; verify review
- [x] 2.2 `join-code.ts` and `join-flow.ts`: both sides of the exchange, joiner falls back to `knock` when no `challenge` arrives in 3 s, holder labels a plain `knock` "not verified"; verify unit tests for the honest flow, a changed key after commitment, and the fallback
- [x] 2.3 (moved to `join-code-drop-fallback`, 2026-11-11) Remove the fallback one release later (separate pull request); verify `join-code.spec.ts` with two contexts
- [x] 2.4 Privacy page and user guide chapter on joining by code (fr/en; neither describes the safety number, so nothing to change besides the new "not verified" label), `pnpm docs:tour && pnpm docs:guide` produce no change; verify `pnpm verify`
