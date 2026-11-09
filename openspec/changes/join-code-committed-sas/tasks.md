# Tasks

## 1. Refuse imitations

- [ ] 1.1 `join-flow.ts` `createJoinHost`: a knock whose number equals a pending one removes both and sets `state.imitation = true`; verify unit tests in `apps/web/test/` (two knocks, same number, different nonce)
- [ ] 1.2 Knock list: warning text and icon (fr/en), cleared when a new code is shown; verify `join-code.spec.ts` and axe on the dialog

## 2. Committed number

- [ ] 2.1 `design.md`: messages `knock2` (commitment), `challenge` (holder value), `reveal` (key), number = digits of SHA-256(key, holder value, nonce); what the relay observes; why 6 digits are enough once committed; verify review
- [ ] 2.2 `join-code.ts` and `join-flow.ts`: both sides of the exchange, joiner falls back to `knock` when no `challenge` arrives in 3 s, holder labels a plain `knock` "not verified"; verify unit tests for the honest flow, a changed key after commitment, and the fallback
- [ ] 2.3 Remove the fallback one release later (separate pull request); verify `join-code.spec.ts` with two contexts
- [ ] 2.4 Privacy page and user guide chapter on joining by code (fr/en), `pnpm docs:tour && pnpm docs:guide`; verify `pnpm verify`
