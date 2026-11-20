# Design

## Context

- License: AGPL-3.0-only with a commercial license (ADR-0010, `NOTICE`); commits up to `last-mit` stay MIT. External contributions therefore need a CLA (task 1.2 of `licensing-and-monetization`).
- CLA mechanics in place: `.github/workflows/cla.yml` (`pull_request_target`, job limited to fork pull requests, plus `issue_comment` for the signature sentence or `recheck`), `scripts/ci/cla-check.mjs` (allowlist, `SIGN_SENTENCE`, `signatures/cla.json` on `cla-signatures`, commit status `CLA`, unit tests), `CONTRIBUTING.md` section "License and CLA", `docs/CLA.md` headed DRAFT. The `cla-signatures` branch does not exist yet and `CLA` is not in the `main` ruleset (`docs/runbooks/repo-settings.md`).
- The business plan (`docs/business-plan.md` 13.2 to 13.6) and the 2026-11-04 diagnosis (issues #464 to #470) describe the offers; their prices differ (proposal, owner decision 3).
- Plans are to be defined once in `packages/domain/entitlements` and enforced through the entitlement token (`licensing-and-monetization` design); premium packs are served by the Worker on a valid token.
- Site pages follow `LegalPage.vue` and `ServicePage.vue` (i18n documents, `useHead`, footer links in `LegalLinks.vue`).
- See proposal.md for the motivation and the owner decisions.

## Goals / Non-Goals

**Goals:**
- `CLA` can be a required check without blocking internal pull requests, and a contributor signs once per text version.
- Every price or limit a visitor sees comes from the plan definitions; the pages hold words, not numbers.
- Sponsorware early access is an entitlement, never withheld code: the repository stays complete and AGPL.

**Non-Goals:**
- Checkout, license redemption, token signing and relay enforcement (`licensing-and-monetization`); a marketplace interface inside the app; invoicing.

## Decisions

1. **The `CLA` status is reported on every pull request so it can be required.** A required status that never reports blocks a pull request, and today the job runs only for fork pull requests. `cla.yml` runs on `pull_request_target` for every pull request (an edit of the workflow that issue #465 explicitly asks for); `cla-check.mjs` sets `CLA` to success at once when the head repository is this repository or every author is allowlisted, and runs the full check otherwise. Alternative: leave the status advisory. Rejected: an unsigned contribution could merge and the dual license would be lost. Alternative: a third-party CLA application. Rejected: no secret and no external service (the workflow's own rule), and `contributor-assistant` is archived.
2. **Agreement versioning.** `docs/CLA.md` carries `Version: 1.0 (date)` in its header; `cla-check.mjs` records `version` with each signature and asks again when the current version differs from the one signed. The individual and entity texts are two sections of one file; the entity version adds the signatory's authority to bind the entity and the covered contributors. A text change is a pull request that bumps the version.
3. **Owner steps are explicit and verifiable, not agent tasks.** The text approval (a comment on #465, then the DRAFT notice removed in the same pull request as the text), the ruleset edit (`docs/runbooks/repo-settings.md` lists `CLA` among the required checks), the test pull request from a non-member account. `pnpm launch:check` (`public-launch`) verifies the three.
4. **Plans in one module, pages read them.** `/offers` and the landing section render the plan definitions of `@retroboard/domain` (`licensing-and-monetization` task 2.1) through one composable `usePlans()` that formats prices with `Intl.NumberFormat` in the person's locale; a unit test fails when a price literal appears in a page or an i18n key. Group 3 depends on that task; until the definitions exist, the page is not published.
5. **Sponsorware as an entitlement claim.** The entitlement gains a `sponsor` claim; a pack entry of the catalogue gains `publicFrom` (ISO date); `packages/domain/entitlements` exposes `isAvailable(pack, now, entitlement)` (pure). The theme picker shows an unavailable pack with its public date. The pack's code is in the repository from its first commit; only the hosted catalogue filters by date. The window length is one constant (owner decision 4). Alternative: a private branch for early packs. Rejected: it withholds code (non-negotiable N6, ADR-0010).
6. **Marketplace as a pull request flow.** `docs/marketplace.md` defines the pack layout (`packages/themes/src/packs/<id>/` with `pack.json`, tokens, fonts, templates, preview), the pull request template section (IP checklist) and the revenue terms; `pnpm pack:check <id>` (`scripts/packs/check.mjs`) runs the contrast tests, a remote-resource scan, the IP keyword list of `themes-pop-culture` and the `pack.json` schema. The merchant of record pays creators through its payout feature when available, otherwise MAIDAF EURL pays at the published cadence from the merchant's report.
7. **Pages.** `/offers` and `/services` reuse the document pattern of `LegalPage.vue` (i18n document keys `offers.*` and `services.*`), appear in `LegalLinks.vue` and in the settings "About" row, and carry the share metadata of `brand-identity`.

Types and ports: `packages/domain/entitlements` gains `sponsor` on the entitlement type, `publicFrom` on a pack entry and `isAvailable` (pure, unit tested); `apps/web` gets the composable `usePlans` and two pages; scripts under `scripts/ci/` (CLA) and `scripts/packs/`. No new port; the relay is unchanged (the token is already verified there by `licensing-and-monetization`).

## Security and privacy

The relay observes nothing new: the offers and services pages are static; the sponsor claim travels in the entitlement token the relay already verifies, with no identity in it. The CLA check reads commit author logins through the GitHub API with the Actions token, checks out nothing from the fork, and stores logins, dates, pull request numbers and the signed version on a branch of this repository: data the contributor made public by opening the pull request. The services page has no form, so nothing is collected; the contact link opens the person's own mail client or the owner's site.

## Risks / Trade-offs

- [The owner delays the legal review] -> the R2 gate "CLA live" slips; the check works with the current text and the readiness check shows the gate red rather than hiding it.
- [A required `CLA` status blocks a pull request when the workflow fails] -> the internal path makes one status write and no other call; `recheck` re-runs it; the admin bypass of the runbook covers an emergency.
- [Prices change after the pages exist] -> the pages hold no number; a change is a pull request on the plan definitions.
- [Sponsorware read as "open core"] -> the code is public from day one and the policy says so on the page; only the hosted catalogue date differs.
- [Manual marketplace payouts at first] -> the cadence is published and the volume will be small (business plan 13.5).

## Migration Plan

1. Group 1 (R2): workflow and script change, versioned texts, runbook; the owner approves the text, adds the required check and opens a test pull request from a fork; `licensing-and-monetization` 1.2 is ticked in the same pull request.
2. Groups 2 to 6 (R4) land after `licensing-and-monetization` 2.1 (plan definitions), in the order sponsors, offers, enterprise, marketplace, services, one pull request each.

Rollback: revert the pull request; signatures already recorded stay on their branch.

## Open Questions

- Should the entity CLA list covered contributors by login, or should the entity's signatory sign per contributor? Both fit the same check; decided when the text is reviewed.
- Will the merchant of record support creator payouts when the marketplace opens (R4)? If not, the manual payout at the published cadence stands.
