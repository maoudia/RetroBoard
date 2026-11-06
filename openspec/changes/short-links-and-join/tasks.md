# Tasks

## 1. Links

- [x] 1.1 ADR on the link format and the knock join (threat model: the relay sees the code and room id, never the key; brute-force limits); verify `pnpm adr:check`
- [x] 1.2 `/boards` path with a client-side redirect from `/board` that keeps the hash; verify e2e that an old link opens the board
- [x] 1.3 Compact link encoding (`#c=`, 128-bit secrets for new boards, ADR-0029) with backward compatibility; verify unit tests and e2e

## 2. Join

- [ ] 2.1 Landing "Join a board" (paste link, scan QR where supported, fr/en); verify e2e and axe
- [ ] 2.2 Knock join code (relay forward, sealed handoff, 10 minute expiry, rate limit); verify crypto unit tests, relay test and e2e two contexts
- [x] 2.3 Room words label and help text; verify e2e
- [x] 2.4 (presenter screen display left) One join field for link, code or room words; code shown large in the invite panel and presenter screen; any online participant may accept when the board allows it (owner feedback 2026-11-02); verify e2e two contexts and axe
