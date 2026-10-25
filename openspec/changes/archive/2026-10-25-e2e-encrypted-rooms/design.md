# Design

## Context

Current protocol sends plaintext commands; the Durable Object reduces them. See docs/PLAN.md 5.1 and 5.2.

## Goals / Non-Goals

**Goals:** confidentiality and integrity against the relay and against non-members; authorship without a server.
**Non-Goals:** protection against a malicious participant who has the key (they can read; they cannot forge others' notes or privileged events); forward secrecy.

## Decisions

- **WebCrypto only** (AES-GCM, HKDF-SHA-256, PBKDF2-SHA-256 600k iterations, Ed25519, X25519). Ed25519/X25519 support in all target browsers must be checked; fallback: `@noble/curves` (audited, pure TS).
- Key derivation: `contentKey = HKDF(ikm=roomKey, salt=roomId, info="rb/content/v1" || passcodeStretch)`. Passcode stretch = PBKDF2(passcode, salt=roomId). Separate HKDF info for `signal` and `file` keys.
- Envelope `{ v:1, roomId, eventId(ULID), hlc, ct }`, AAD = `v|roomId|eventId|hlc`. Nonce 96-bit random per event.
- Genesis event contains facilitator public key and policies; it is signed with the facilitator key and is the root of trust.
- Facilitator link `#k=<roomKey>&f=<facilitatorSecret>`; participants' link omits `f`. Share dialog never shows `f` except to the facilitator.
- ~~Turnstile on /new~~ dropped (owner decision 2026-10-24): no third-party widget and no paid or vendor-specific service. Abuse protection stays at the edge (Cloudflare automatic DDoS mitigation, a free rate-limiting rule on `/ws2`, Under Attack Mode when needed) plus the relay's own per-socket budgets; see docs/capacity.md.
- Where it lives: primitives in `packages/crypto`; `KeyRing` value object in `domain/access`; `CreateBoard`, `JoinBoard` use cases in `application`; envelope schema in `protocol`; admission in `apps/relay`.

Security and privacy note: the relay observes room ids, IPs, timing and sizes (docs/PLAN.md 5.7). Links in browser history contain the key; the share dialog warns not to paste links in public channels.

## Risks / Trade-offs

- [Key in URL appears in history and screenshots] -> optional passcode; "copy link" never puts the key in the visible part of QR captions.
- [Lost facilitator link] -> co-facilitator delegation; facilitator key also kept in the facilitator's browser.
- [Scripted room creation] -> edge rate limiting and relay budgets; rooms cost almost nothing since the peer-to-peer mesh.

## Migration Plan

Ship behind protocol v2; the relay accepts v1 only for rooms created before the release date for 24 h, then v1 is removed.
