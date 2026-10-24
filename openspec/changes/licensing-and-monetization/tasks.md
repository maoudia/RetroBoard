# Tasks

## 1. License

- [x] 1.1 Replace LICENSE with AGPL-3.0-only, add NOTICE (MIT up to tag `last-mit`, commercial license), update README, package.json and footer wording; verified by owner request on 2026-10-24
- [ ] 1.2 Add CLA Assistant (or equivalent) for external pull requests and a CONTRIBUTING section explaining the CLA; verify a test PR from a non-member account shows the CLA check
- [ ] 1.3 Add a "Source code" link in the board UI footer or menu (AGPL section 13 offer for network users); verify e2e link target

## 2. Plans and tokens

- [ ] 2.1 Plan definitions in `domain/entitlements` and token schema; verify unit tests
- [ ] 2.2 `/license/redeem` (Turnstile, Polar validation, EdDSA signing) and public keys endpoint; verify unit tests with a mocked Polar API
- [ ] 2.3 Relay enforcement (participant cap, session length, TURN credentials) from the facilitator token; verify e2e with test keys

## 3. Product

- [ ] 3.1 License key entry and plan status in profile (fr/en); verify e2e with a mocked redeem endpoint
- [ ] 3.2 Premium pack delivery behind token (402 otherwise); verify e2e
- [ ] 3.3 Pricing, terms and refund pages (fr/en) reviewed by the owner and the accountant; verify approval comment
