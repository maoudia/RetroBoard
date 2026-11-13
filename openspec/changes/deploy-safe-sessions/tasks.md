# Tasks

## 1. Harness scenarios

- [x] 1.1 `apps/web/test/sync-harness.test.ts`, marked `it.fails`: relay closes all sockets with three linked peers (links must stay open, an event sent meanwhile must arrive); a peer on an older schema receives an unknown command; 100 envelopes of 3 KB uploaded by the seeder; 9,000 small envelopes uploaded; verify each fails for the stated reason

## 2. Versions converge

- [x] 2.1 `packages/protocol/src/envelope.ts`: tolerant parsing of `Presence`, `Cursor`, `Focus` (unknown keys ignored) and a parser that tells "valid signed event with an unknown body" from "invalid"; verify unit tests and the mutation score of the package
- [x] 2.2 `encrypted.ts` `ingest`: store and forward unknown-body events without folding them; `onNotice({ kind: 'newer-version' })` once per session; verify the harness scenario of 1.1 passes
- [x] 2.3 Reload banner (fr/en) in the board page with a "Reload" action; verify e2e with a stubbed newer event and axe on the banner

## 3. Uploads the relay accepts

- [x] 3.1 `push` cuts by bytes with `chunk()` from `packages/protocol/src/buffer.ts` and sends at most 40 `pub` frames per `LIMITS.rateWindowMs`; verify the two upload scenarios of 1.1 pass
- [x] 3.2 Backoff: `attempts` resets only after `hist` done and 30 s without a close; closes with code 1008 or 1009 never reset it; verify a harness test counting at most 2 reconnects in 60 s

## 4. Links survive the relay

- [ ] 4.1 `design.md` decision: grace period, matching old and new connection ids by session key, what happens when the key changes; security note (what the relay observes is unchanged); verify review
- [ ] 4.2 `mesh.ts` and `encrypted.ts`: keep links on `ws.onclose`, re-key them on the next `welcome`; verify the restart scenario of 1.1 passes and `p2p.spec.ts` stays green
- [ ] 4.3 `EnvelopeBuffer.clear()` and a call in `webSocketClose` and `webSocketError` when no socket remains; verify `apps/relay/test/relay-core.test.ts`
- [ ] 4.4 `docs/PLAN.md` sync section and README line on what a deploy does to a live board; verify `pnpm verify`
