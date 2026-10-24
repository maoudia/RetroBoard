# Design

## Decisions

- Polar license validation endpoint `POST /v1/customer-portal/license-keys/validate` with `key` and `organization_id` (per Polar docs); subscription keys are revoked when the subscription ends, so validation reflects status.
- Token: compact JWS (EdDSA) `{ plan, limits, packs, exp, iat, kid }`; public keys published at `/.well-known/retroboard-keys.json` for self-verification; key rotation by `kid`.
- No storage: the Worker is stateless; abuse limited by Turnstile on redemption and the rate limiting binding if available on the free plan (to verify), otherwise a per-IP cap in a Durable Object counter kept in memory.
- Premium packs: built from a private package at deploy time into a Worker-only path (`/premium/<pack>.js`) served by the Worker after token verification, not from the public assets directory.
- Plan definitions in `packages/domain/entitlements` (single source for landing, UI and relay).
- Honest gating: client-only features in source-available code can be rebuilt by self-hosters for their own use, which the FSL allows; we sell the hosted service and content.

## Risks / Trade-offs

- [MoR fees on small monthly prices] -> annual plans first (docs/PLAN.md 13.2).
- [Polar outage] -> existing tokens keep working up to 7 days.
- [License change perception] -> clear README and landing wording, MIT notice for old releases.

## Migration Plan

1. Change LICENSE to FSL-1.1-ALv2 in one commit with NOTICE; tag the last MIT release.
2. Ship free-plan limits in the relay with generous defaults.
3. Enable Polar products and redemption; announce pricing.
