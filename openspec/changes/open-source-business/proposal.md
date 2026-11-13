# Proposal

## Why

The code stays AGPL-3.0-only (ADR-0010) and the plan is to earn from convenience, capacity, brand and expertise rather than from the code: a facilitator subscription, sponsors, a community marketplace, a self-host offer for IT departments and MAIDAF's facilitation and training missions (docs/business-plan.md, epic #464). Two things stand between that plan and the launch. The Contributor License Agreement, without which the dual license is lost on the first external pull request: the workflow and the check exist, but the text is a draft, the signatures branch has never been created and the `CLA` status is not required (launch study of 2026-11-12, section 6). And none of the offers is written anywhere a visitor can read it. The CLA group ships before the launch (R2); the rest is R4.

## What Changes

- **CLA live** (group 1, R2): the agreement in an individual and an entity version with a version number and date, the draft notice removed after the owner's review; `CONTRIBUTING.md` and the check's comment without "draft"; the `CLA` status reported on every pull request so that it can be a required check of `main` (an edit of `.github/workflows/cla.yml`, which issue #465 explicitly asks for); the runbook line; a test pull request from a fork. This group takes over task 1.2 of `licensing-and-monetization`, ticked when this group lands.
- **Sponsors and sponsorware** (R4): GitHub Sponsors tiers and `.github/FUNDING.yml` (owner enrolment), a sponsorware policy (a new theme or format reaches sponsors on the hosted service a fixed number of days before everyone, its code public from the first commit) granted through the entitlement token of `licensing-and-monetization`.
- **Offers page** (R4): `/offers` in French and English, linked from the landing and the settings: Free first, Pro, Team, packs, self-host, enterprise, services; prices and limits from the plan definitions shared with the checkout and the relay, so that the page cannot disagree with them.
- **Self-host enterprise offer** (R4): an enterprise section in `docs/self-hosting.md` (support, response times, private installation, branding, contact) and a commercial license template published after the owner's legal review.
- **Community marketplace** (R4, specification and tooling only): the contribution format for themes and retro formats, the review rules with the IP checklist of `themes-pop-culture`, the revenue share paid through the merchant of record, a check script for a pack.
- **Services page** (R4): `/services`, "Facilitation and training", in French and English, a contact link, no form, no tracker.

Out of scope: checkout, license keys, entitlement tokens, relay enforcement and the transactional pages (terms of sale, refunds), all in `licensing-and-monetization`; the landing's pricing summary (`landing-v2-and-product-video` task 2.2, which links to `/offers`); the license of the code (ADR-0010, not reopened); customer accounts; a marketplace user interface inside the app (packs are pull requests and catalogue entries).

Bounded contexts: Access (`Entitlement` gains a sponsor claim read by the sponsorware availability rule; no new aggregate). The rest is documentation, repository settings and static pages. Relay traffic: none.

Owner decisions, open until the owner answers (the tasks that depend on them say so):

1. **CLA text.** Approve or replace `docs/CLA.md` and its entity version, with or without a lawyer, and remove the DRAFT notice. The R2 gate "CLA live" waits on this.
2. **CLA enforcement.** Add `CLA` to the required status checks of the `main` ruleset and open one test pull request from a non-member account; both are the owner's (ruleset, second account).
3. **Pricing.** `docs/business-plan.md` says Pro 24 EUR per year or 2.99 EUR per month and Team 79 EUR per year; issue #467 says Pro 3 EUR per month or 29 EUR per year, Team 7 EUR per month or 69 EUR per year, and enterprise self-host from 990 EUR per year. One set has to be chosen before the offers page is published.
4. **Sponsorware and marketplace terms.** The early-access window (90 days proposed), the GitHub Sponsors tiers, the creator share of the marketplace (70 percent proposed) and its payout cadence.
5. **Training.** Whether Qualiopi certification and OPCO funding apply to the training offer; the services page claims nothing until then.

## Capabilities

### New Capabilities

- `contributor-agreement`: the agreement external contributors sign and how a pull request proves it.
- `commercial-offers`: what the project sells and gives away as a visitor reads it: offers, sponsorship and sponsorware, enterprise self-host, services.
- `community-marketplace`: how themes and formats made by the community are reviewed, published and paid.

### Modified Capabilities

None.

## Impact

- Repository: `docs/CLA.md`, `CONTRIBUTING.md`, `.github/workflows/cla.yml` and `scripts/ci/cla-check.mjs` (every pull request, versioned signatures, wording), `docs/runbooks/repo-settings.md`, `.github/FUNDING.yml` (owner), `docs/sponsorware.md`, `docs/marketplace.md`, `docs/commercial-license.md`, `docs/self-hosting.md`, `NOTICE`, `scripts/packs/check.mjs`.
- Web: pages `/offers` and `/services` (fr and en), footer and settings links, i18n keys, a composable reading the plan definitions of `packages/domain/entitlements` (`licensing-and-monetization` task 2.1, a dependency of group 3), `sponsor` claim and `publicFrom` availability rule in the same package.
- `licensing-and-monetization/tasks.md`: task 1.2 is marked as taken over by this change (ticked when group 1 lands).
