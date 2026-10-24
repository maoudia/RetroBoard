# Tasks

## 1. License

- [ ] 1.1 Replace LICENSE with FSL-1.1-ALv2 (owner MAIDAF EURL), add NOTICE about MIT releases up to the last MIT tag, update README and landing wording; verify the license check job and owner approval

## 2. Plans and tokens

- [ ] 2.1 Plan definitions in `domain/entitlements` and token schema; verify unit tests
- [ ] 2.2 `/license/redeem` (Turnstile, Polar validation, EdDSA signing) and public keys endpoint; verify unit tests with a mocked Polar API
- [ ] 2.3 Relay enforcement (participant cap, session length, TURN credentials) from the facilitator token; verify e2e with test keys

## 3. Product

- [ ] 3.1 License key entry and plan status in profile (fr/en); verify e2e with a mocked redeem endpoint
- [ ] 3.2 Premium pack delivery behind token (402 otherwise); verify e2e
- [ ] 3.3 Pricing, terms and refund pages (fr/en) reviewed by the owner and the accountant; verify approval comment
