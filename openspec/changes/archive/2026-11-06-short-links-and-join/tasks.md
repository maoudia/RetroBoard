# Tasks

## 1. Links

- [x] 1.1 ADR on the link format and the knock join (threat model: the relay sees the code and room id, never the key; brute-force limits); verify `pnpm adr:check`
- [x] 1.2 `/boards` path with a client-side redirect from `/board` that keeps the hash; verify e2e that an old link opens the board
- [x] 1.3 Compact link encoding (`#c=`, 128-bit secrets for new boards, ADR-0029) with backward compatibility; verify unit tests and e2e

## 2. Join

- [x] 2.1 Landing "Join a board" (paste link, scan QR with the browser's own reader where supported, fr/en; `camera=(self)` in the Permissions-Policy); verify e2e and axe
- [x] 2.2 Knock join code: both sides in `join-flow.ts` (dependency-injected, so unit tested), sealed hand-off to the knocker's one-time key, 10 minute expiry, at most five knocks counting the ones still being hashed (a burst used to get past the cap and a late hash could re-add a knock after the code stopped), 90 s wait for the joiner, relay forwards the side room as live frames under the existing per-socket budget (no relay change, ADR-0028); verify crypto and join-flow unit tests, relay budget tests, e2e two contexts
- [x] 2.3 Room words label and help text; verify e2e
- [x] 2.4 (presenter screen display left) One join field for link, code or room words; code shown large in the invite panel and presenter screen; any online participant may accept when the board allows it (owner feedback 2026-11-02); verify e2e two contexts and axe
