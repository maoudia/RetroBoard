# Tasks

## 1. CLA

- [ ] 1.1 `docs/CLA.md` version 1.0: individual and entity texts, version and date in the header, a changelog section; `CONTRIBUTING.md` and the comment of `scripts/ci/cla-check.mjs` without "draft"; the DRAFT notice removed after the owner's approval; verify the approval comment on #465 and a unit test that `docs/CLA.md` carries a version line and no draft notice
- [ ] 1.2 `.github/workflows/cla.yml` and `cla-check.mjs`: run on every pull request, immediate success for pull requests of the repository and allowlisted authors, full check for forks, the signed version recorded and compared with the current one; verify `scripts/ci/test/cla-check.test.ts` (internal, fork unsigned, fork signed, outdated version) and `actionlint` and `zizmor` clean
- [ ] 1.3 `docs/runbooks/repo-settings.md` lists `CLA` among the required status checks with the reason, and `licensing-and-monetization/tasks.md` 1.2 is ticked as taken over; verify the owner's confirmation that the `main` ruleset contains `CLA` and that a test pull request from a fork showed the comment, the signature and the green status (`cla-signatures` branch present), recorded in the runbook

## 2. Sponsors and sponsorware

- [ ] 2.1 `docs/sponsorware.md` (policy, window, what sponsors get, code public from day one), `.github/FUNDING.yml` and a Sponsors section in `README.md` once the owner's GitHub Sponsors profile is active; verify the owner's confirmation of the tiers on #466 and `pnpm verify` green
- [ ] 2.2 `sponsor` claim on the entitlement, `publicFrom` on pack entries and `isAvailable(pack, now, entitlement)` in `packages/domain/entitlements`; the theme picker shows an early-access pack with its public date to others; verify unit tests of `isAvailable` (before, during and after the window, with and without the claim) and an e2e of the picker with a mocked token

## 3. Offers page

- [ ] 3.1 `/offers` in fr and en from the plan definitions (`usePlans`, prices through `Intl.NumberFormat`), free first, then plans, packs, self-host, enterprise and services, links from the landing, the settings and `LegalLinks.vue`, share metadata; needs `licensing-and-monetization` 2.1; verify e2e `offers.spec.ts` (both languages, axe, links), a unit test that no price literal exists in pages or i18n keys, and the guide footer regenerated (`pnpm docs:tour && pnpm docs:guide`)
- [ ] 3.2 Prices confirmed by the owner (proposal decision 3) before the page is linked; verify the confirmation comment on #467 and the plan definitions updated in the same pull request

## 4. Self-host enterprise offer

- [ ] 4.1 Enterprise section in `docs/self-hosting.md` (free self-host and AGPL section 13, what the enterprise offer adds, support and response times, private installation, branding, contact) and `NOTICE` referencing the commercial license document; verify the links resolve and `pnpm verify` is green
- [ ] 4.2 Commercial license template `docs/commercial-license.md`, published after the owner's legal review; verify the review comment on #468 and that the document carries its version and date

## 5. Community marketplace

- [ ] 5.1 `docs/marketplace.md`: pack layout, `pack.json` schema, contribution steps, the IP checklist of `themes-pop-culture`, review rules, revenue share and payout cadence (owner decision 4), price classes; verify a unit test of the `pack.json` schema and `pnpm verify`
- [ ] 5.2 `pnpm pack:check <id>` (`scripts/packs/check.mjs`): contrast tests, remote-resource scan, IP keyword list, schema; verify unit tests with one passing pack and three failing ones (remote font, missing English template, franchise name)

## 6. Services page

- [ ] 6.1 `/services` "Facilitation and training" in fr and en with a contact link (mail or maoudia.com), no form, no tracker, linked from the offers page and `LegalLinks.vue`; verify e2e `services.spec.ts` (both languages, axe, no request leaves the origin) and the guide footer regenerated
- [ ] 6.2 Funding and certification wording (Qualiopi, OPCO) added only after the owner's answer; verify the owner's comment on #470 and the i18n keys in fr and en
