# Tasks

## 1. Links

- [ ] 1.1 ADR on the link format and the knock join (threat model: the relay sees the code and room id, never the key; brute-force limits); verify `pnpm adr:check`
- [ ] 1.2 `/boards/` path with redirects from `/board/`; verify e2e that an old link opens the board
- [ ] 1.3 Compact link encoding with backward compatibility; verify unit tests and e2e

## 2. Join

- [ ] 2.1 Landing "Join a board" (paste link, scan QR where supported, fr/en); verify e2e and axe
- [ ] 2.2 Knock join code (relay forward, sealed handoff, 10 minute expiry, rate limit); verify crypto unit tests, relay test and e2e two contexts
- [ ] 2.3 Room words label and help text; verify e2e
