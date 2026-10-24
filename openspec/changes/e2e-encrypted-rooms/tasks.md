# Tasks

## 1. Crypto primitives

- [x] 1.1 Implement `packages/crypto` (random keys, HKDF, PBKDF2, AES-GCM seal/open with AAD, Ed25519 sign/verify, X25519 seal) with test vectors; verify unit tests including tamper and wrong-AAD cases
- [ ] 1.2 Add a browser support check and `@noble/curves` fallback for Ed25519/X25519; verify the e2e matrix (Chromium, Firefox, WebKit) runs the crypto self-test page

## 2. Keys, links, genesis

- [ ] 2.1 Add `KeyRing` and link codec (`#k=`, `&f=`) in domain/application; verify unit tests for parse/format and that the facilitator secret is never in the participant link
- [ ] 2.2 Implement signed genesis event and facilitator capability checks in the domain fold; verify unit tests where forged privileged events are ignored
- [ ] 2.3 Implement per-session signing keys and authorship checks; verify unit tests where edits from another key are ignored

## 3. Protocol and relay

- [ ] 3.1 Define envelope v2 schema in `packages/protocol` and encrypt/decrypt in the relay adapter; verify an e2e test that inspects WebSocket frames and finds no plaintext note text
- [ ] 3.2 Add Turnstile to /new and verification in the relay on first connection of a room; verify e2e with the Turnstile test keys (always-pass and always-fail)

## 4. Passcode and UX

- [ ] 4.1 Add optional passcode at creation and the passcode prompt on join (fr, en); verify e2e: wrong passcode shows nothing, right passcode shows the board
- [ ] 4.2 Update share dialog and docs (privacy page, docs/ARCHITECTURE.md) with the new link format and warnings; verify e2e for copy link and docs link check
